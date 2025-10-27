<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schema;
use App\Models\SchemaMapping;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EntityController extends Controller
{
    /**
     * Save entity mappings for a schema
     */
    public function saveEntities(Request $request, string $schemaId): JsonResponse
    {
        try {
            $request->validate([
                'schema_name' => 'sometimes|string',
                'entities' => 'required|array',
                'entities.*.fieldPath' => 'required|string',
                'entities.*.entityName' => 'required|string',
                'entities.*.isArray' => 'required|boolean',
                'entities.*.schemaMapping' => 'required|array',
                'external_id_field' => 'sometimes|nullable|string',
                'dedupe_field' => 'sometimes|nullable|string',
            ]);

            $inputSchema = Schema::findOrFail($schemaId);

            // Get tenant_id from the schema (multi-tenant support)
            $tenantId = $inputSchema->tenant_id;

            DB::transaction(function () use ($request, $inputSchema, $tenantId) {
                Log::info('===== SAVE ENTITIES DEBUG =====', [
                    'schema_id' => $inputSchema->id,
                    'entities_count' => count($request->entities),
                    'entities_data' => $request->entities,
                ]);

                foreach ($request->entities as $entityData) {
                    // Check if entity schema already exists
                    $structSchema = Schema::where('name', $entityData['entityName'])
                        ->where('tenant_id', $tenantId)
                        ->where('type', 'struct')
                        ->first();

                    if ($structSchema) {
                        // Entity already exists - DO NOT update its fields
                        // Just create the mapping to the existing entity

                        // Update dedupe field if provided (only when mapping to existing)
                        $dedupeField = $request->input('dedupe_field');
                        if ($dedupeField) {
                            $structSchema->update([
                                'dedupe_field' => $dedupeField,
                            ]);
                        }

                        Log::info('Mapping to existing entity', [
                            'entity_name' => $entityData['entityName'],
                            'entity_id' => $structSchema->id,
                            'preserving_fields' => count($structSchema->detected_fields ?? []),
                            'dedupe_field' => $dedupeField,
                        ]);
                    } else {
                        // Entity doesn't exist - create a new one
                        $detectedFields = $this->convertMappingToDetectedFields($entityData['schemaMapping']);

                        // If external ID field is specified, add {schema_name}_id field
                        $externalIdField = $request->input('external_id_field');
                        $schemaName = $request->input('schema_name', $inputSchema->name ?? 'schema');
                        if ($externalIdField) {
                            // Find the external ID field type from input schema
                            $externalIdFieldData = collect($inputSchema->detected_fields)->firstWhere('name', $externalIdField);

                            if ($externalIdFieldData) {
                                $schemaIdFieldName = strtolower(str_replace(' ', '_', $schemaName)) . '_id';
                                $detectedFields[] = [
                                    'name' => $schemaIdFieldName,
                                    'type' => $externalIdFieldData['type'] ?? 'string',
                                    'required' => $externalIdFieldData['required'] ?? false,
                                    'sample_value' => $externalIdFieldData['sample_value'] ?? null,
                                    'is_external_id' => true,
                                    'source_field' => $externalIdField,
                                ];
                            }
                        }

                        $structSchema = Schema::create([
                            'name' => $entityData['entityName'],
                            'tenant_id' => $tenantId,
                            'type' => 'struct',
                            'sample_data' => $this->convertMappingToStructData($entityData['schemaMapping']),
                            'detected_fields' => $detectedFields,
                            'status' => 'confirmed',
                            'hash' => 'struct_' . md5($entityData['entityName'] . $tenantId),
                            // Dedupe NOT saved for new entities - only when mapping to existing
                        ]);

                        Log::info('Created new entity', [
                            'entity_name' => $entityData['entityName'],
                            'entity_id' => $structSchema->id,
                            'fields' => count($detectedFields),
                            'has_external_id' => !is_null($externalIdField),
                            'dedupe_field' => $request->input('dedupe_field'),
                        ]);
                    }

                    // Create field-level mappings (one SchemaMapping row per field)
                    foreach ($entityData['schemaMapping']['fields'] as $fieldMapping) {
                        $isFormulaField = isset($fieldMapping['mappingType']) && $fieldMapping['mappingType'] === 'formula';

                        SchemaMapping::updateOrCreate(
                            [
                                'schema_id' => $inputSchema->id,
                                'field_path' => $fieldMapping['sourcePath'],
                            ],
                            [
                                'target_schema_id' => $structSchema->id,
                                'is_array' => $fieldMapping['isArray'] ?? false,
                                'mapping_definition' => [
                                    'entity_name' => $entityData['entityName'],
                                    'schema_mapping' => [
                                        'fields' => [$fieldMapping] // Single field per mapping row
                                    ],
                                ],
                                'mapping_type' => $isFormulaField ? 'formula' : 'direct',
                                'formula_expression' => $isFormulaField ? ($fieldMapping['formulaExpression'] ?? null) : null,
                                'formula_language' => $isFormulaField ? ($fieldMapping['formulaLanguage'] ?? 'JSONata') : null,
                            ]
                        );
                    }
                }

                // Update input schema status to confirmed and type to 'entity'
                $updateData = [
                    'type' => 'entity',
                    'status' => 'confirmed',
                    'confirmed_at' => now(),
                ];

                // Set schema name if provided
                if ($request->has('schema_name')) {
                    $updateData['name'] = $request->input('schema_name');
                }

                // Set external ID field if provided
                if ($request->has('external_id_field')) {
                    $updateData['external_id_field'] = $request->input('external_id_field');
                }

                $inputSchema->update($updateData);
            });

            return response()->json([
                'success' => true,
                'message' => 'Entities saved successfully',
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to save entities', [
                'error' => $e->getMessage(),
                'schema_id' => $schemaId,
                'request_data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to save entities: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Convert schema mapping to struct data format
     */
    private function convertMappingToStructData(array $schemaMapping): array
    {
        $structData = [];
        
        foreach ($schemaMapping['fields'] as $field) {
            // Create a sample structure for the struct
            $structData[$field['fieldName']] = $this->getSampleValueForType($field['fieldType']);
        }

        return $structData;
    }

    /**
     * Convert schema mapping to detected fields format
     */
    private function convertMappingToDetectedFields(array $schemaMapping): array
    {
        $detectedFields = [];

        foreach ($schemaMapping['fields'] as $field) {
            $detectedFields[] = [
                'name' => $field['fieldName'],
                'type' => $field['fieldType'],
                'required' => $field['isRequired'],
                'sample_value' => $this->getSampleValueForType($field['fieldType']),
                // Include formula metadata if present
                'mapping_type' => $field['mappingType'] ?? 'direct',
                'formula_expression' => $field['formulaExpression'] ?? null,
                'formula_language' => $field['formulaLanguage'] ?? null,
            ];
        }

        return $detectedFields;
    }

    /**
     * Get a sample value for a given field type
     */
    private function getSampleValueForType(string $type): mixed
    {
        return match (true) {
            $type === 'string' => 'example_string',
            $type === 'number' => 123,
            $type === 'boolean' => true,
            $type === 'null' => null,
            str_starts_with($type, 'array') => [],
            default => 'entity_reference', // For entity types
        };
    }

    /**
     * Create mapping definition for schema mapping
     */
    private function createMappingDefinition(array $entityData): array
    {
        // Preserve formula metadata in field mappings
        $schemaMapping = $entityData['schemaMapping'];

        // Ensure each field maintains its formula information
        if (isset($schemaMapping['fields'])) {
            foreach ($schemaMapping['fields'] as &$field) {
                // Preserve formula data if present
                if (!isset($field['mapping_type'])) {
                    $field['mapping_type'] = 'direct';
                }
            }
        }

        return [
            'entity_name' => $entityData['entityName'],
            'field_path' => $entityData['fieldPath'],
            'is_array' => $entityData['isArray'],
            'schema_mapping' => $schemaMapping,
            'mapping_type' => 'one_to_one',
        ];
    }

    /**
     * Get entities for a schema
     */
    public function getEntities(string $schemaId): JsonResponse
    {
        try {
            $schema = Schema::with([
                'sourceMappings.targetSchema'
            ])->findOrFail($schemaId);

            $entities = $schema->sourceMappings->map(function ($mapping) {
                return [
                    'id' => $mapping->targetSchema->id,
                    'name' => $mapping->targetSchema->name,
                    'field_path' => $mapping->field_path,
                    'is_array' => $mapping->is_array,
                    'struct' => $mapping->targetSchema->sample_data,
                    'detected_fields' => $mapping->targetSchema->detected_fields,
                    'mapping_definition' => $mapping->mapping_definition,
                ];
            });

            return response()->json([
                'success' => true,
                'entities' => $entities,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get entities: ' . $e->getMessage(),
            ], 500);
        }
    }
}
