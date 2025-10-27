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
            $table->json('ai_recommendations')->nullable()->after('entity_mappings');
            $table->enum('ai_analysis_status', ['pending', 'completed', 'failed', 'disabled'])->default('pending')->after('ai_recommendations');
            $table->timestamp('ai_analyzed_at')->nullable()->after('ai_analysis_status');
            $table->text('ai_analysis_error')->nullable()->after('ai_analyzed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schemas', function (Blueprint $table) {
            $table->dropColumn(['ai_recommendations', 'ai_analysis_status', 'ai_analyzed_at', 'ai_analysis_error']);
        });
    }
};
