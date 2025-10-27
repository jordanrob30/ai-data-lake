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
        Schema::create('schema_entity_mappings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('schema_id'); // References schemas table
            $table->unsignedBigInteger('entity_schema_id'); // References entity_schemas table
            $table->string('field_path'); // Dot notation path in source schema (e.g., 'customer.address', 'items[0].product')
            $table->boolean('is_array')->default(false); // Whether this mapping represents an array
            $table->json('mapping'); // Detailed mapping definition
            $table->timestamps();
            
            $table->foreign('schema_id')->references('id')->on('schemas');
            $table->foreign('entity_schema_id')->references('id')->on('entity_schemas');
            $table->index(['schema_id', 'field_path']);
            $table->index('entity_schema_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schema_entity_mappings');
    }
};