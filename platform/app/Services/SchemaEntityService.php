<?php

namespace App\Services;

use App\Models\Schema;
use App\Models\SchemaMapping;
use Illuminate\Support\Facades\Log;
use Exception;

class SchemaEntityService
{
    /**
     * Create a canonical entity schema from AI recommendations
     *
     * @param Schema $sourceSchema The bronze schema
     * @param array $aiRecommendations The AI analysis results
     * @return Schema The created canonical entity schema
     * @throws Exception
     */
    public function createCanonicalEntity(Schema $sourceSchema, array $aiRecommendations): Schema
    {
        $action = $aiRecommendations['action'] ?? 'create_new';

        if ($action === 'map_to_existing') {
            return $this->mapToExistingEntity($sourceSchema, $aiRecommendations);
        }

        return $this->createNewEntity($sourceSchema, $aiRecommendations);
    }

    /**
     * Create a new canonical entity schema
     *
     * @param Schema $sourceSchema
     * @param array $aiRecommendations
     * @return Schema
     */
    private function createNewEntity(Schema $sourceSchema, array $aiRecommendations): Schema
    {
        $entityName = $aiRecommendations['entity_name'];
        $canonicalFields = $aiRecommendations['canonical_schema']['fields'] ?? [];
        $fieldMappings = $aiRecommendations['field_mappings'] ?? [];

        // Generate a hash for the canonical schema based on field names and types
        $hashInput = collect($canonicalFields)
            ->map(fn($field) => $field['name'] . ':' . $field['type'])
            ->sort()
            ->join(',');
        $entityHash = substr(hash('sha256', $hashInput), 0, 16);

        // Check if canonical entity already exists with this hash
        $existingEntity = Schema::where('tenant_id', $sourceSchema->tenant_id)
            ->where('hash', $entityHash)
            ->where('type', 'struct')
            ->first();

        if ($existingEntity) {
            Log::info('Canonical entity already exists, mapping to it', [
                'entity_id' => $existingEntity->id,
                'entity_name' => $existingEntity->name,
            ]);

            // Update the mapping between source and entity
            $this->updateSchemaMapping($sourceSchema, $existingEntity, $fieldMappings);

            return $existingEntity;
        }

        // Create new canonical entity schema
        $canonicalSchema = Schema::create([
            'tenant_id' => $sourceSchema->tenant_id,
            'name' => $entityName,
            'hash' => $entityHash,
            'type' => 'struct',
            'status' => 'confirmed', // Canonical entities are automatically confirmed
            'detected_fields' => $canonicalFields,
            'sample_data' => $this->generateSampleFromCanonical($canonicalFields),
            'ai_analysis_status' => 'completed',
            'ai_analyzed_at' => now(),
        ]);

        Log::info('Created new canonical entity', [
            'entity_id' => $canonicalSchema->id,
            'entity_name' => $entityName,
            'entity_hash' => $entityHash,
            'field_count' => count($canonicalFields),
        ]);

        // Create the mapping between source schema and canonical entity
        $this->updateSchemaMapping($sourceSchema, $canonicalSchema, $fieldMappings);

        return $canonicalSchema;
    }

    /**
     * Map to an existing canonical entity
     *
     * @param Schema $sourceSchema
     * @param array $aiRecommendations
     * @return Schema
     */
    private function mapToExistingEntity(Schema $sourceSchema, array $aiRecommendations): Schema
    {
        $entityId = $aiRecommendations['entity_id'];
        $fieldMappings = $aiRecommendations['field_mappings'] ?? [];

        $existingEntity = Schema::find($entityId);

        if (!$existingEntity) {
            throw new Exception("Entity with ID {$entityId} not found");
        }

        Log::info('Mapping to existing canonical entity', [
            'source_schema_id' => $sourceSchema->id,
            'entity_id' => $existingEntity->id,
            'entity_name' => $existingEntity->name,
        ]);

        // Update the mapping between source schema and existing entity
        $this->updateSchemaMapping($sourceSchema, $existingEntity, $fieldMappings);

        return $existingEntity;
    }

    /**
     * Update the schema with entity mapping information
     *
     * @param Schema $sourceSchema The bronze schema
     * @param Schema $targetEntity The canonical entity
     * @param array $fieldMappings The field-to-field mappings from AI
     */
    private function updateSchemaMapping(Schema $sourceSchema, Schema $targetEntity, array $fieldMappings): void
    {
        // Delete existing mappings for this source schema (in case of re-analysis)
        SchemaMapping::where('schema_id', $sourceSchema->id)->delete();

        // Create SchemaMapping records for each field mapping
        foreach ($fieldMappings as $mapping) {
            $sourceField = $mapping['source_field'];
            $targetField = $mapping['target_field'];
            $transformation = $mapping['transformation'] ?? 'direct';
            $jsonataFormula = $mapping['jsonata_formula'] ?? '';

            // Build mapping definition structure
            $mappingDefinition = [
                'schema_mapping' => [
                    'fields' => [
                        [
                            'sourcePath' => $sourceField,
                            'fieldName' => $targetField,
                            'sourceType' => $this->getFieldType($sourceSchema, $sourceField),
                            'fieldType' => $this->getFieldType($targetEntity, $targetField),
                        ]
                    ]
                ]
            ];

            // Determine if this is a formula mapping or direct mapping
            $isFormula = !empty($jsonataFormula) && $transformation !== 'direct';

            SchemaMapping::create([
                'schema_id' => $sourceSchema->id,
                'target_schema_id' => $targetEntity->id,
                'field_path' => $sourceField,
                'is_array' => false,
                'mapping_definition' => $mappingDefinition,
                'mapping_type' => $isFormula ? 'formula' : 'direct',
                'formula_expression' => $isFormula ? $jsonataFormula : null,
                'formula_language' => $isFormula ? 'JSONata' : null,
            ]);
        }

        // Update the source schema status to confirmed now that it's mapped
        $sourceSchema->update([
            'status' => 'confirmed',
        ]);

        Log::info('Created SchemaMapping records', [
            'source_schema_id' => $sourceSchema->id,
            'target_entity_id' => $targetEntity->id,
            'mapping_count' => count($fieldMappings),
        ]);
    }

    /**
     * Get the type of a field from a schema
     *
     * @param Schema $schema
     * @param string $fieldName
     * @return string
     */
    private function getFieldType(Schema $schema, string $fieldName): string
    {
        $fields = $schema->detected_fields ?? [];

        foreach ($fields as $field) {
            if ($field['name'] === $fieldName) {
                return $field['type'] ?? 'string';
            }
        }

        return 'string'; // Default fallback
    }

    /**
     * Generate sample data structure from canonical fields
     *
     * @param array $canonicalFields
     * @return array
     */
    private function generateSampleFromCanonical(array $canonicalFields): array
    {
        $sample = [];

        foreach ($canonicalFields as $field) {
            $fieldName = $field['name'];
            $fieldType = $field['type'];

            // Generate appropriate sample values based on type
            $sample[$fieldName] = match ($fieldType) {
                'string' => 'sample_' . $fieldName,
                'integer', 'int' => 0,
                'float', 'double', 'decimal' => 0.0,
                'boolean', 'bool' => false,
                'date' => '2025-01-01',
                'datetime', 'timestamp' => '2025-01-01T00:00:00Z',
                'array' => [],
                'object' => new \stdClass(),
                default => null,
            };
        }

        return [$sample];
    }
}
