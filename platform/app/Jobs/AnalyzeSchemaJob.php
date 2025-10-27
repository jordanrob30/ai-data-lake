<?php

namespace App\Jobs;

use App\Events\SchemaAnalysisEvent;
use App\Models\Schema;
use App\Services\ThalamusSchemaService;
use App\Services\SchemaEntityService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class AnalyzeSchemaJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $schemaId
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(ThalamusSchemaService $thalamusService, SchemaEntityService $entityService): void
    {
        try {
            $schema = Schema::find($this->schemaId);

            if (!$schema) {
                Log::error('Schema not found for analysis', ['schema_id' => $this->schemaId]);
                return;
            }

            Log::info('Starting schema analysis with Thalamus', [
                'schema_id' => $this->schemaId,
                'schema_hash' => $schema->hash,
            ]);

            // Update status to processing
            $schema->update(['ai_analysis_status' => 'processing']);

            // Load tenant relationship for broadcast
            $schema->load('tenant');

            // Broadcast that analysis has started
            try {
                Log::info('Broadcasting analysis started event', [
                    'schema_id' => $schema->id,
                    'tenant_id' => $schema->tenant_id,
                ]);

                broadcast(new SchemaAnalysisEvent('started', $schema, [
                    'name' => $schema->name,
                    'hash' => $schema->hash,
                    'tenant' => $schema->tenant->name ?? 'Unknown',
                    'detected_fields' => $schema->detected_fields,
                ]))->toOthers();

                Log::info('Started event broadcasted successfully');
            } catch (\Exception $e) {
                Log::error('Failed to broadcast started event', [
                    'error' => $e->getMessage(),
                ]);
            }

            // Analyze schema using Thalamus
            $recommendations = $thalamusService->analyzeSchema($schema);

            // Update schema with AI recommendations including the improved name
            $updateData = [
                'ai_recommendations' => $recommendations,
                'ai_analysis_status' => 'completed',
                'ai_analyzed_at' => now(),
                'ai_analysis_error' => null,
            ];

            // Update the schema name if AI provided a better one
            if (!empty($recommendations['source_schema_name'])) {
                $updateData['name'] = $recommendations['source_schema_name'];
                Log::info('Updating bronze schema name based on recommendation', [
                    'schema_id' => $this->schemaId,
                    'old_name' => $schema->name,
                    'new_name' => $recommendations['source_schema_name'],
                ]);
            }

            $schema->update($updateData);

            Log::info('Schema analysis completed successfully', [
                'schema_id' => $this->schemaId,
                'action' => $recommendations['action'] ?? 'unknown',
                'bronze_name' => $recommendations['source_schema_name'] ?? $schema->name,
                'silver_name' => $recommendations['entity_name'] ?? 'unknown',
            ]);

            // Automatically create the canonical entity and mapping
            try {
                $canonicalEntity = $entityService->createCanonicalEntity($schema, $recommendations);

                Log::info('Automatically created canonical entity and mapping', [
                    'source_schema_id' => $this->schemaId,
                    'canonical_entity_id' => $canonicalEntity->id,
                    'canonical_entity_name' => $canonicalEntity->name,
                ]);

                // Reload schema to get updated relationships
                $schema->load('tenant');
                $schema->refresh();

                // Broadcast that analysis completed with schema and entity data
                broadcast(new SchemaAnalysisEvent('completed', $schema, [
                    'bronze_schema' => [
                        'id' => $schema->id,
                        'hash' => $schema->hash,
                        'name' => $schema->name,
                        'type' => $schema->type,
                        'status' => $schema->status,
                        'tenant' => $schema->tenant->name ?? 'Unknown',
                        'detected_fields' => $schema->detected_fields,
                        'created_at' => $schema->created_at->format('Y-m-d'),
                    ],
                    'silver_entity' => [
                        'id' => $canonicalEntity->id,
                        'name' => $canonicalEntity->name,
                        'hash' => $canonicalEntity->hash,
                        'type' => $canonicalEntity->type,
                        'detected_fields' => $canonicalEntity->detected_fields,
                    ],
                    'mappings_count' => $schema->sourceMappings()->count(),
                ]));
            } catch (\Exception $e) {
                Log::error('Failed to auto-create canonical entity', [
                    'schema_id' => $this->schemaId,
                    'error' => $e->getMessage(),
                ]);

                // Broadcast failure
                broadcast(new SchemaAnalysisEvent('failed', $schema, [
                    'error' => $e->getMessage(),
                ]));

                // Don't throw - analysis succeeded, entity creation is secondary
            }

        } catch (\Exception $e) {
            Log::error('Schema analysis failed', [
                'schema_id' => $this->schemaId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            if (isset($schema)) {
                $schema->update([
                    'ai_analysis_status' => 'failed',
                    'ai_analysis_error' => $e->getMessage(),
                    'ai_analyzed_at' => now(),
                ]);

                // Broadcast failure
                broadcast(new SchemaAnalysisEvent('failed', $schema, [
                    'error' => $e->getMessage(),
                ]));
            }

            // Re-throw to mark job as failed in queue
            throw $e;
        }
    }
}