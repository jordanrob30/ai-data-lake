<?php

namespace App\Jobs;

use App\Events\SchemaAnalysisEvent;
use App\Models\Schema;
use App\Services\AISchemaService;
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
    public function handle(AISchemaService $aiService, SchemaEntityService $entityService): void
    {
        try {
            $schema = Schema::find($this->schemaId);

            if (!$schema) {
                Log::error('Schema not found for AI analysis', ['schema_id' => $this->schemaId]);
                return;
            }

            if (!$aiService->isEnabled()) {
                Log::info('AI analysis is disabled', ['schema_id' => $this->schemaId]);
                $schema->update(['ai_analysis_status' => 'disabled']);
                return;
            }

            Log::info('Starting AI schema analysis', ['schema_id' => $this->schemaId]);

            // Broadcast that analysis has started
            try {
                Log::info('About to broadcast started event', [
                    'schema_id' => $schema->id,
                    'tenant_id' => $schema->tenant_id,
                ]);

                broadcast(new SchemaAnalysisEvent('started', $schema, [
                    'hash' => $schema->hash,
                    'detected_fields' => $schema->detected_fields,
                ]))->toOthers();

                Log::info('Started event broadcasted successfully');
            } catch (\Exception $e) {
                Log::error('Failed to broadcast started event', [
                    'error' => $e->getMessage(),
                ]);
            }

            $recommendations = $aiService->analyzeSchema($schema);

            $schema->update([
                'ai_recommendations' => $recommendations,
                'ai_analysis_status' => 'completed',
                'ai_analyzed_at' => now(),
                'ai_analysis_error' => null,
            ]);

            Log::info('AI schema analysis completed successfully', [
                'schema_id' => $this->schemaId,
                'action' => $recommendations['action'] ?? 'unknown',
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
                $schema->refresh();

                // Broadcast that analysis completed with schema and entity data
                broadcast(new SchemaAnalysisEvent('completed', $schema, [
                    'bronze_schema' => [
                        'id' => $schema->id,
                        'hash' => $schema->hash,
                        'name' => $schema->name,
                        'type' => $schema->type,
                        'status' => $schema->status,
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

                // Don't throw - AI analysis succeeded, entity creation is secondary
            }

        } catch (\Exception $e) {
            Log::error('AI schema analysis failed', [
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
