<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzeSchemaJob;
use App\Models\Schema;
use App\Services\SchemaComparisonService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class SchemaController extends Controller
{
    /**
     * Get existing schema by hash and tenant
     */
    public function getByHash(Request $request, string $hash): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $schema = Schema::where('hash', $hash)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$schema) {
            return response()->json(['error' => 'Schema not found'], 404);
        }

        return response()->json([
            'id' => $schema->id,
            'hash' => $schema->hash,
            'name' => $schema->name,
            'tenant_id' => $schema->tenant_id,
            'status' => $schema->status,
            'detected_fields' => $schema->detected_fields,
            'confirmed_at' => $schema->confirmed_at,
            'created_at' => $schema->created_at,
            'updated_at' => $schema->updated_at,
        ]);
    }

    /**
     * Create a new schema confirmation request
     */
    public function create(Request $request): JsonResponse
    {
        $request->validate([
            'hash' => 'required|string',
            'kafka_topic' => 'required|string',
            'tenant_id' => 'required|string|exists:tenants,id',
            'sample_data' => 'required|array',
            'detected_fields' => 'required|array',
        ]);

        // Check if schema already exists
        $existingSchema = Schema::where('hash', $request->hash)
            ->where('tenant_id', $request->tenant_id)
            ->first();

        if ($existingSchema) {
            return response()->json([
                'id' => $existingSchema->id,
                'hash' => $existingSchema->hash,
                'status' => $existingSchema->status,
                'message' => 'Schema already exists'
            ]);
        }

        $schema = Schema::create([
            'hash' => $request->hash,
            'kafka_topic' => $request->kafka_topic,
            'tenant_id' => $request->tenant_id,
            'sample_data' => $request->sample_data,
            'detected_fields' => $request->detected_fields,
            'status' => 'pending',
        ]);

        // Automatically trigger Thalamus analysis in the background
        try {
            AnalyzeSchemaJob::dispatch($schema->id);
            Log::info('Thalamus analysis job dispatched', ['schema_id' => $schema->id]);
        } catch (\Exception $e) {
            Log::error('Failed to dispatch Thalamus analysis job', [
                'schema_id' => $schema->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'id' => $schema->id,
            'hash' => $schema->hash,
            'status' => $schema->status,
            'message' => 'Schema created successfully'
        ], 201);
    }

    /**
     * Get all confirmed schemas for a tenant
     */
    public function getConfirmed(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $schemas = Schema::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->select(['id', 'hash', 'name', 'status', 'confirmed_at'])
            ->get();

        return response()->json(['schemas' => $schemas]);
    }

    /**
     * Get all pending schemas for a tenant
     */
    public function getPending(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $schemas = Schema::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->select(['id', 'hash', 'sample_data', 'detected_fields', 'created_at'])
            ->get();

        return response()->json(['schemas' => $schemas]);
    }

    /**
     * Get pending records count for a specific schema hash
     */
    public function getPendingRecordsCount(Request $request, string $hash): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        // Verify schema exists for this tenant
        $schema = Schema::where('hash', $hash)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$schema) {
            return response()->json(['error' => 'Schema not found'], 404);
        }

        // Get pending records count from database (much faster than querying Kafka)
        $pendingRecords = $schema->pending_records;
        
        return response()->json([
            'hash' => $hash,
            'kafka_topic' => $schema->kafka_topic,
            'pending_records' => $pendingRecords,
            'status' => $schema->status
        ]);
    }

    /**
     * Increment pending records count for a specific schema hash
     */
    public function incrementPendingRecords(Request $request, string $hash): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        // Find the schema
        $schema = Schema::where('hash', $hash)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$schema) {
            return response()->json(['error' => 'Schema not found'], 404);
        }

        // Increment the pending records count
        $schema->incrementPendingRecords();

        return response()->json([
            'hash' => $hash,
            'pending_records' => $schema->fresh()->pending_records,
            'status' => 'incremented'
        ]);
    }

    /**
     * Convert a pending schema to a silver layer entity
     * Creates a duplicate entity schema while keeping the original bronze schema
     */
    public function createAsEntity(Request $request): JsonResponse
    {
        $request->validate([
            'schema_id' => 'required|integer|exists:schemas,id',
            'schema_name' => 'sometimes|string',
            'entity_name' => 'sometimes|string',
            'external_id_field' => 'sometimes|nullable|string',
        ]);

        // Find the source schema (bronze layer)
        $sourceSchema = Schema::findOrFail($request->schema_id);

        // Verify it's pending
        if ($sourceSchema->status !== 'pending') {
            return response()->json([
                'error' => 'Schema is not pending. Current status: ' . $sourceSchema->status
            ], 400);
        }

        // Use provided names or fall back to defaults
        $schemaName = $request->input('schema_name', $sourceSchema->name ?? "Schema {$sourceSchema->hash}");
        $entityName = $request->input('entity_name', $sourceSchema->name ?? "Entity {$sourceSchema->hash}");
        $externalIdField = $request->input('external_id_field');

        // Prepare entity detected fields
        $entityDetectedFields = $sourceSchema->detected_fields;

        // If external ID field is specified, add {schema_name}_id field to entity schema
        if ($externalIdField) {
            // Find the external ID field in source schema
            $externalIdFieldData = collect($sourceSchema->detected_fields)->firstWhere('name', $externalIdField);

            if ($externalIdFieldData) {
                // Add {schema_name}_id field to entity schema
                $schemaIdFieldName = strtolower(str_replace(' ', '_', $schemaName)) . '_id';
                $entityDetectedFields[] = [
                    'name' => $schemaIdFieldName,
                    'type' => $externalIdFieldData['type'] ?? 'string',
                    'required' => $externalIdFieldData['required'] ?? false,
                    'sample_value' => $externalIdFieldData['sample_value'] ?? null,
                    'is_external_id' => true, // Mark as external ID mapping
                    'source_field' => $externalIdField,
                ];
            }
        }

        // Create a new entity schema (silver layer) - duplicate the bronze schema with modifications
        $entitySchema = Schema::create([
            'hash' => $sourceSchema->hash . '-entity', // Different hash for entity
            'name' => $entityName,
            'tenant_id' => $sourceSchema->tenant_id,
            'type' => 'struct', // Silver layer type
            'status' => 'confirmed',
            'detected_fields' => $entityDetectedFields,
            'sample_data' => $sourceSchema->sample_data,
            'confirmed_at' => now(),
            // Dedupe field NOT saved when creating new entities
        ]);

        // Confirm the source schema (bronze layer is now active)
        $sourceSchema->update([
            'name' => $schemaName,
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'external_id_field' => $externalIdField, // Store external ID field reference
        ]);

        // Create individual field-level mappings from bronze to silver
        // One mapping record per field for proper visualization
        $fieldMappings = [];
        foreach ($sourceSchema->detected_fields as $field) {
            // Determine target field name
            $targetFieldName = $field['name'];

            // If this is the external ID field, map it to {schema_name}_id
            if ($externalIdField && $field['name'] === $externalIdField) {
                $targetFieldName = strtolower(str_replace(' ', '_', $schemaName)) . '_id';
            }

            $fieldMapping = $sourceSchema->sourceMappings()->create([
                'target_schema_id' => $entitySchema->id,
                'field_path' => $field['name'],
                'is_array' => false,
                'mapping_definition' => [
                    'type' => 'direct_promotion',
                    'created_via' => 'create_as_entity',
                    'is_external_id_mapping' => ($externalIdField && $field['name'] === $externalIdField),
                    'schema_mapping' => [
                        'fields' => [
                            [
                                'sourcePath' => $field['name'],
                                'fieldName' => $targetFieldName,
                                'transformation' => 'direct',
                                'sourceType' => $field['type'] ?? 'unknown',
                            ]
                        ]
                    ]
                ],
            ]);
            $fieldMappings[] = $fieldMapping;
        }

        return response()->json([
            'message' => 'Schema successfully promoted to silver layer entity',
            'field_mappings_created' => count($fieldMappings),
            'source_schema' => [
                'id' => $sourceSchema->id,
                'hash' => $sourceSchema->hash,
                'name' => $sourceSchema->fresh()->name, // Get fresh value after update
                'status' => $sourceSchema->status,
                'type' => $sourceSchema->type ?? 'raw',
            ],
            'entity_schema' => [
                'id' => $entitySchema->id,
                'hash' => $entitySchema->hash,
                'name' => $entitySchema->name,
                'type' => $entitySchema->type,
                'status' => $entitySchema->status,
                'confirmed_at' => $entitySchema->confirmed_at,
            ]
        ]);
    }

    /**
     * Get field-level similarity matches between a source schema and an entity schema
     * Used for intelligent auto-mapping on the dashboard
     */
    public function getEntityFieldMatches(int $schemaId, int $entityId, SchemaComparisonService $comparisonService): JsonResponse
    {
        // Find the schemas
        $sourceSchema = Schema::findOrFail($schemaId);
        $entitySchema = Schema::findOrFail($entityId);

        // Verify entity is a confirmed struct
        if ($entitySchema->type !== 'struct') {
            return response()->json([
                'error' => 'Target is not an entity schema'
            ], 400);
        }

        $sourceFields = $sourceSchema->detected_fields ?? [];
        $entityFields = $entitySchema->detected_fields ?? [];

        // Calculate field-level similarities
        $matches = [];

        foreach ($sourceFields as $sourceField) {
            $sourceName = $sourceField['name'] ?? '';
            $sourceType = $sourceField['type'] ?? 'unknown';

            // Find best matching entity field
            $bestMatch = null;
            $bestSimilarity = 0;

            foreach ($entityFields as $entityField) {
                $entityName = $entityField['name'] ?? '';
                $entityType = $entityField['type'] ?? 'unknown';

                // Calculate name similarity using Levenshtein distance
                $maxLen = max(strlen($sourceName), strlen($entityName));
                if ($maxLen > 0) {
                    $distance = levenshtein(strtolower($sourceName), strtolower($entityName));
                    $nameSimilarity = 1 - ($distance / $maxLen);
                } else {
                    $nameSimilarity = 0;
                }

                // Check type compatibility
                $typeCompatible = $this->areTypesCompatible($sourceType, $entityType);

                // Combined similarity score (70% name, 30% type)
                $similarity = ($nameSimilarity * 0.7) + ($typeCompatible ? 0.3 : 0);

                if ($similarity > $bestSimilarity) {
                    $bestSimilarity = $similarity;
                    $bestMatch = [
                        'target_field' => $entityName,
                        'target_type' => $entityType,
                        'similarity' => round($similarity, 4),
                        'type_compatible' => $typeCompatible,
                    ];
                }
            }

            // Only include matches above threshold
            if ($bestMatch && $bestSimilarity >= 0.3) { // 30% minimum
                $matches[] = [
                    'source_field' => $sourceName,
                    'source_type' => $sourceType,
                    'target_field' => $bestMatch['target_field'],
                    'target_type' => $bestMatch['target_type'],
                    'similarity' => $bestMatch['similarity'],
                    'type_compatible' => $bestMatch['type_compatible'],
                    'suggested' => $bestSimilarity >= 0.7, // Auto-suggest if >70%
                ];
            }
        }

        // Sort by similarity descending
        usort($matches, fn($a, $b) => $b['similarity'] <=> $a['similarity']);

        return response()->json([
            'schema_id' => $schemaId,
            'entity_id' => $entityId,
            'schema_name' => $sourceSchema->name ?? "Schema {$sourceSchema->hash}",
            'entity_name' => $entitySchema->name,
            'matches' => $matches,
            'total_source_fields' => count($sourceFields),
            'total_entity_fields' => count($entityFields),
            'suggested_count' => count(array_filter($matches, fn($m) => $m['suggested'])),
        ]);
    }

    /**
     * Check if two field types are compatible
     */
    private function areTypesCompatible(string $type1, string $type2): bool
    {
        // Exact match
        if ($type1 === $type2) {
            return true;
        }

        // Numeric type compatibility
        $numericTypes = ['integer', 'float', 'number', 'decimal'];
        if (in_array($type1, $numericTypes) && in_array($type2, $numericTypes)) {
            return true;
        }

        // String type compatibility
        $stringTypes = ['string', 'text', 'varchar', 'email', 'url', 'uuid', 'phone'];
        if (in_array($type1, $stringTypes) && in_array($type2, $stringTypes)) {
            return true;
        }

        // Date/time compatibility
        $dateTypes = ['date', 'datetime', 'timestamp'];
        if (in_array($type1, $dateTypes) && in_array($type2, $dateTypes)) {
            return true;
        }

        return false;
    }

    /**
     * Analyze a schema using AI to generate entity mapping recommendations
     */
    public function analyzeSchema(Request $request, string $schemaId, AISchemaService $aiService): JsonResponse
    {
        try {
            $schema = Schema::findOrFail($schemaId);

            // Check if AI analysis is enabled
            if (!$aiService->isEnabled()) {
                return response()->json([
                    'success' => false,
                    'message' => 'AI schema analysis is disabled',
                ], 503);
            }

            // Check if already analyzed
            if ($schema->ai_analysis_status === 'completed') {
                return response()->json([
                    'success' => true,
                    'message' => 'Schema already analyzed',
                    'recommendations' => $schema->ai_recommendations,
                    'analyzed_at' => $schema->ai_analyzed_at,
                ]);
            }

            // Update status to pending
            $schema->update([
                'ai_analysis_status' => 'pending',
            ]);

            // Perform AI analysis
            $recommendations = $aiService->analyzeSchema($schema);

            // Save recommendations
            $schema->update([
                'ai_recommendations' => $recommendations,
                'ai_analysis_status' => 'completed',
                'ai_analyzed_at' => now(),
                'ai_analysis_error' => null,
            ]);

            Log::info('Schema AI analysis completed successfully', [
                'schema_id' => $schema->id,
                'action' => $recommendations['action'] ?? 'unknown',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'AI analysis completed successfully',
                'recommendations' => $recommendations,
                'analyzed_at' => $schema->ai_analyzed_at,
            ]);

        } catch (\Exception $e) {
            Log::error('Schema AI analysis failed', [
                'schema_id' => $schemaId,
                'error' => $e->getMessage(),
            ]);

            // Update schema with error status
            if (isset($schema)) {
                $schema->update([
                    'ai_analysis_status' => 'failed',
                    'ai_analysis_error' => $e->getMessage(),
                    'ai_analyzed_at' => now(),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'AI analysis failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get AI recommendations for a schema
     */
    public function getAIRecommendations(Request $request, string $schemaId): JsonResponse
    {
        try {
            $schema = Schema::findOrFail($schemaId);

            return response()->json([
                'success' => true,
                'recommendations' => $schema->ai_recommendations,
                'status' => $schema->ai_analysis_status,
                'analyzed_at' => $schema->ai_analyzed_at,
                'error' => $schema->ai_analysis_error,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get AI recommendations: ' . $e->getMessage(),
            ], 500);
        }
    }
}