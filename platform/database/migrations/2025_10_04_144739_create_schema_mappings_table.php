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
        Schema::create('schema_mappings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('schema_id'); // Source schema (bronze)
            $table->unsignedBigInteger('target_schema_id'); // Target entity schema (silver)
            $table->string('field_path'); // Dot notation path in source schema
            $table->boolean('is_array')->default(false); // Whether this mapping represents an array
            $table->json('mapping_definition')->nullable(); // Detailed field-level mapping
            $table->timestamps();

            $table->foreign('schema_id')->references('id')->on('schemas')->onDelete('cascade');
            $table->foreign('target_schema_id')->references('id')->on('schemas')->onDelete('cascade');
            $table->index(['schema_id', 'field_path']);
            $table->index('target_schema_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schema_mappings');
    }
};
