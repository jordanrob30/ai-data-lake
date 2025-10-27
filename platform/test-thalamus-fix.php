<?php

// Test script to verify Thalamus integration fix
require __DIR__ . '/vendor/autoload.php';

use App\Models\Schema;
use App\Services\ThalamusSchemaService;
use Illuminate\Support\Facades\Log;

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    // Find a schema to test with - try any schema first
    $schema = Schema::whereNotNull('tenant_id')
        ->first();

    if (!$schema) {
        echo "No schemas found in database.\n";
        exit(1);
    }

    // If the schema doesn't have sample_data, add some test data
    if (empty($schema->sample_data)) {
        echo "Schema has no sample data. Adding test sample data...\n";
        $schema->sample_data = [
            'id' => 'test_id_123',
            'name' => 'Test Record',
            'created_at' => '2025-10-27T12:00:00Z',
        ];
        $schema->save();
    }

    echo "Testing with schema ID: {$schema->id}\n";
    echo "Schema name: " . ($schema->name ?? 'null') . "\n";
    echo "Tenant ID: {$schema->tenant_id}\n";
    echo "Sample data is " . (is_array($schema->sample_data) ? "array" : "not array") . "\n";

    // Initialize the service
    $service = new ThalamusSchemaService();

    echo "\nCalling Thalamus API...\n";

    // Test the fix
    $result = $service->analyzeSchema($schema);

    echo "\nSuccess! Analysis completed.\n";
    echo "Action: {$result['action']}\n";
    echo "Entity name: {$result['entity_name']}\n";
    echo "Source schema name: {$result['source_schema_name']}\n";

    if (isset($result['similarity_score'])) {
        echo "Similarity score: {$result['similarity_score']}\n";
    }

    echo "\nField mappings count: " . count($result['field_mappings']) . "\n";

} catch (\Exception $e) {
    echo "\nError occurred:\n";
    echo $e->getMessage() . "\n";
    echo "\nStack trace:\n";
    echo $e->getTraceAsString() . "\n";
}