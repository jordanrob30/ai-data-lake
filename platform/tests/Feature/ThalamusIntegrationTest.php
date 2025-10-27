<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Schema;
use App\Models\Tenant;
use App\Services\ThalamusSchemaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

class ThalamusIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_thalamus_service_is_configured()
    {
        $service = app(ThalamusSchemaService::class);

        $this->assertInstanceOf(ThalamusSchemaService::class, $service);
    }

    public function test_thalamus_health_check()
    {
        // Mock the HTTP response
        Http::fake([
            '*/health' => Http::response([
                'status' => 'healthy',
                'service' => 'Thalamus Schema Analyzer',
                'version' => '1.0.0'
            ], 200)
        ]);

        $service = app(ThalamusSchemaService::class);
        $health = $service->healthCheck();

        $this->assertIsArray($health);
        $this->assertEquals('healthy', $health['status']);
        $this->assertEquals('Thalamus Schema Analyzer', $health['service']);
    }

    public function test_thalamus_analyze_schema()
    {
        // Create test tenant and schema
        $tenant = Tenant::create([
            'id' => 'test-tenant',
            'name' => 'Test Tenant',
        ]);

        $schema = Schema::create([
            'tenant_id' => $tenant->id,
            'hash' => 'test_hash',
            'name' => 'test_schema',
            'detected_fields' => [
                ['name' => 'id', 'type' => 'integer'],
                ['name' => 'name', 'type' => 'string'],
            ],
            'sample_data' => [
                ['id' => 1, 'name' => 'Test'],
            ],
            'status' => 'pending',
            'type' => 'struct',
        ]);

        // Mock the HTTP response for analyze-schema
        Http::fake([
            '*/analyze-schema' => Http::response([
                'action' => 'create_new',
                'entity_name' => 'TestEntity',
                'source_schema_name' => 'test_schema_improved',
                'field_mappings' => [
                    [
                        'source_field' => 'id',
                        'target_field' => 'id',
                        'transformation' => 'direct',
                    ],
                    [
                        'source_field' => 'name',
                        'target_field' => 'name',
                        'transformation' => 'direct',
                    ],
                ],
            ], 200)
        ]);

        $service = app(ThalamusSchemaService::class);
        $result = $service->analyzeSchema($schema);

        $this->assertIsArray($result);
        $this->assertEquals('create_new', $result['action']);
        $this->assertEquals('TestEntity', $result['entity_name']);
        $this->assertEquals('test_schema_improved', $result['source_schema_name']);
        $this->assertCount(2, $result['field_mappings']);
    }
}