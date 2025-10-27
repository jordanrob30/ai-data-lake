#!/usr/bin/env php
<?php

/**
 * Test script to trigger schema analysis and verify real-time updates
 * Run this from the platform directory: php test-schema-analysis.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Boot the application
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Schema;
use App\Models\Tenant;
use App\Jobs\AnalyzeSchemaJob;
use Illuminate\Support\Facades\Log;

// Get first tenant or create one
$tenant = Tenant::first();
if (!$tenant) {
    echo "No tenants found. Creating test tenant...\n";
    $tenant = Tenant::create([
        'id' => 'test-tenant',
        'name' => 'Test Tenant',
    ]);
}
echo "Using tenant: {$tenant->name} (ID: {$tenant->id})\n";

// Find or create a test schema
$testData = [
    'tenant_id' => $tenant->id,
    'hash' => 'test_' . substr(md5(uniqid()), 0, 16),
    'name' => 'Test Schema ' . date('Y-m-d H:i:s'),
    'status' => 'pending',
    'type' => 'struct',
    'detected_fields' => [
        ['name' => 'id', 'type' => 'integer'],
        ['name' => 'name', 'type' => 'string'],
        ['name' => 'email', 'type' => 'string'],
        ['name' => 'created_at', 'type' => 'datetime'],
    ],
    'sample_data' => [
        'id' => 1,
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'created_at' => '2024-01-15 10:30:00'
    ],
    'ai_analysis_status' => 'pending',
];

echo "Creating test schema...\n";
$schema = Schema::create($testData);
echo "Created schema ID: {$schema->id}\n";
echo "Schema hash: {$schema->hash}\n";

// Dispatch the analysis job
echo "Dispatching Thalamus analysis job...\n";
AnalyzeSchemaJob::dispatch($schema->id);

echo "Job dispatched! Check the dashboard to see the analyzing state.\n";
echo "The schema should appear as 'analyzing' and then update when complete.\n";

echo "\nTo monitor the job processing:\n";
echo "1. Open the dashboard in your browser\n";
echo "2. Watch for the schema to appear in 'analyzing' state\n";
echo "3. Check logs: docker-compose logs -f queue-worker\n";
echo "\nSchema details:\n";
echo "- ID: {$schema->id}\n";
echo "- Hash: {$schema->hash}\n";
echo "- Name: {$schema->name}\n";
echo "- Tenant ID: {$schema->tenant_id}\n";