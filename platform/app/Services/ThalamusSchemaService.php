<?php

namespace App\Services;

use App\Models\Schema;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class ThalamusSchemaService
{
    private string $apiUrl;
    private int $timeout;

    public function __construct()
    {
        $this->apiUrl = config('services.thalamus.url', 'http://thalamus:8001');
        $this->timeout = config('services.thalamus.timeout', 60);
    }

    /**
     * Analyze a schema using the Thalamus API
     *
     * @param Schema $incomingSchema The schema to analyze
     * @return array The analysis recommendations
     * @throws Exception
     */
    public function analyzeSchema(Schema $incomingSchema): array
    {
        try {
            // Get all existing canonical entities for this tenant
            $existingEntities = Schema::where('tenant_id', $incomingSchema->tenant_id)
                ->where('type', 'struct')
                ->where('status', 'confirmed')
                ->get()
                ->map(function ($schema) {
                    return [
                        'id' => $schema->id,
                        'name' => $schema->name,
                        'fields' => $schema->detected_fields ?? [],
                    ];
                })
                ->toArray();

            // Prepare the request payload
            // Ensure sample_data is always an array of records
            $sampleData = $incomingSchema->sample_data ?? [];
            if (!empty($sampleData) && !isset($sampleData[0])) {
                // If sample_data is a single record (not an array of records), wrap it
                $sampleData = [$sampleData];
            }

            // Convert tenant UUID to a simple integer for Thalamus
            // Using a hash of the UUID to get a consistent integer
            $tenantIdInt = abs(crc32($incomingSchema->tenant_id ?? 'default'));

            $payload = [
                'incoming_schema' => [
                    'id' => $incomingSchema->id ?? 0,  // Default to 0 if null
                    'hash' => $incomingSchema->hash,
                    'name' => $incomingSchema->name ?? 'unknown_schema',  // Ensure name is never null
                    'tenant_id' => $tenantIdInt,  // Convert UUID to integer
                    'detected_fields' => $incomingSchema->detected_fields ?? [],
                    'sample_data' => $sampleData,  // Ensure it's always an array of records
                ],
                'existing_entities' => $existingEntities,
            ];

            Log::info('Calling Thalamus API for schema analysis', [
                'schema_id' => $incomingSchema->id,
                'schema_hash' => $incomingSchema->hash,
                'existing_entities_count' => count($existingEntities),
            ]);

            // Call the Thalamus API
            $response = Http::timeout($this->timeout)
                ->post($this->apiUrl . '/analyze-schema', $payload);

            if (!$response->successful()) {
                throw new Exception('Thalamus API request failed: ' . $response->body());
            }

            $result = $response->json();

            // Validate required fields in response
            if (!isset($result['action']) || !isset($result['field_mappings'])) {
                throw new Exception('Invalid response from Thalamus API');
            }

            Log::info('Thalamus API analysis completed', [
                'schema_id' => $incomingSchema->id,
                'action' => $result['action'],
                'entity_name' => $result['entity_name'] ?? 'unknown',
            ]);

            return $result;

        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Thalamus API request failed', [
                'schema_id' => $incomingSchema->id,
                'error' => $e->getMessage(),
                'response' => $e->response?->body(),
            ]);

            throw new Exception('Failed to connect to Thalamus API: ' . $e->getMessage());

        } catch (Exception $e) {
            Log::error('Thalamus schema analysis failed', [
                'schema_id' => $incomingSchema->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Get the Thalamus API health status
     *
     * @return array|null
     */
    public function healthCheck(): ?array
    {
        try {
            $response = Http::timeout(5)
                ->get($this->apiUrl . '/health');

            if ($response->successful()) {
                return $response->json();
            }

            return null;

        } catch (Exception $e) {
            Log::error('Thalamus health check failed', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}