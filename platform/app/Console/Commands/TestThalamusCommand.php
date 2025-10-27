<?php

namespace App\Console\Commands;

use App\Models\Schema;
use App\Services\ThalamusSchemaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class TestThalamusCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'thalamus:test {schema_id? : The ID of the schema to test}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the Thalamus API integration';

    /**
     * Execute the console command.
     */
    public function handle(ThalamusSchemaService $thalamusService)
    {
        $this->info('Testing Thalamus API integration...');

        // Check health
        $this->info('Checking Thalamus health...');
        $health = $thalamusService->healthCheck();

        if ($health) {
            $this->info('✅ Thalamus is healthy: ' . json_encode($health));
        } else {
            $this->error('❌ Thalamus health check failed');
            return 1;
        }

        // If a schema ID is provided, test with that schema
        $schemaId = $this->argument('schema_id');

        if ($schemaId) {
            $schema = Schema::find($schemaId);

            if (!$schema) {
                $this->error('Schema not found: ' . $schemaId);
                return 1;
            }

            $this->info('Testing analysis for schema: ' . $schema->name);

            try {
                $result = $thalamusService->analyzeSchema($schema);

                $this->info('✅ Analysis successful!');
                $this->info('Action: ' . $result['action']);
                $this->info('Entity Name: ' . $result['entity_name']);
                $this->info('Source Schema Name: ' . $result['source_schema_name']);
                $this->info('Field Mappings Count: ' . count($result['field_mappings']));

                // Display some mappings
                $this->info("\nSample Field Mappings:");
                foreach (array_slice($result['field_mappings'], 0, 3) as $mapping) {
                    $this->info(sprintf(
                        "  %s → %s (%s)",
                        $mapping['source_field'] ?: '[constant]',
                        $mapping['target_field'],
                        $mapping['transformation']
                    ));
                }

            } catch (\Exception $e) {
                $this->error('❌ Analysis failed: ' . $e->getMessage());
                return 1;
            }
        } else {
            // Create a test schema
            $this->info('Creating a test schema for demonstration...');

            $testSchema = new Schema([
                'id' => 999,
                'hash' => 'test_' . uniqid(),
                'name' => 'test_customer_data',
                'tenant_id' => 1,
                'detected_fields' => [
                    ['name' => 'customer_name', 'type' => 'string'],
                    ['name' => 'email', 'type' => 'string'],
                    ['name' => 'phone', 'type' => 'string'],
                    ['name' => 'address', 'type' => 'string'],
                ],
                'sample_data' => [
                    [
                        'customer_name' => 'John Smith',
                        'email' => 'john@example.com',
                        'phone' => '555-123-4567',
                        'address' => '123 Main St, New York, NY 10001'
                    ]
                ],
            ]);

            try {
                $result = $thalamusService->analyzeSchema($testSchema);

                $this->info('✅ Test analysis successful!');
                $this->info('Action: ' . $result['action']);
                $this->info('Entity Name: ' . $result['entity_name']);
                $this->info('Field Mappings Count: ' . count($result['field_mappings']));

            } catch (\Exception $e) {
                $this->error('❌ Test analysis failed: ' . $e->getMessage());
                return 1;
            }
        }

        return 0;
    }
}