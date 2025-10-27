<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First drop the foreign key constraint from schema_entity_mappings
        Schema::table('schema_entity_mappings', function (Blueprint $table) {
            $table->dropForeign(['entity_schema_id']);
        });
        
        // Now we can drop the entity_schemas table
        Schema::dropIfExists('entity_schemas');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('entity_schemas', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Entity name (e.g., 'Customer', 'Address')
            $table->string('tenant_id');
            $table->json('struct'); // Entity structure/properties definition
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->index(['tenant_id', 'name']);
        });
    }
};