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
        Schema::table('schemas', function (Blueprint $table) {
            $table->json('entity_mappings')->nullable()->after('detected_fields');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schemas', function (Blueprint $table) {
            $table->dropColumn('entity_mappings');
        });
    }
};
