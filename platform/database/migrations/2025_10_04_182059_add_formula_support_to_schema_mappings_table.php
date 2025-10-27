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
        Schema::table('schema_mappings', function (Blueprint $table) {
            $table->enum('mapping_type', ['direct', 'formula'])->default('direct')->after('field_path');
            $table->text('formula_expression')->nullable()->after('mapping_type');
            $table->string('formula_language', 50)->nullable()->after('formula_expression');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schema_mappings', function (Blueprint $table) {
            $table->dropColumn(['mapping_type', 'formula_expression', 'formula_language']);
        });
    }
};
