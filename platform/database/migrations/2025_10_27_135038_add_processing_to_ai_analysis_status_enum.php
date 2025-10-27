<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the existing constraint
        DB::statement("ALTER TABLE schemas DROP CONSTRAINT IF EXISTS schemas_ai_analysis_status_check");

        // Add the new constraint with 'processing' included
        DB::statement("ALTER TABLE schemas ADD CONSTRAINT schemas_ai_analysis_status_check CHECK (ai_analysis_status IN ('pending', 'processing', 'completed', 'failed', 'disabled'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'processing' from the enum values
        DB::statement("ALTER TABLE schemas DROP CONSTRAINT IF EXISTS schemas_ai_analysis_status_check");
        DB::statement("ALTER TABLE schemas ADD CONSTRAINT schemas_ai_analysis_status_check CHECK (ai_analysis_status IN ('pending', 'completed', 'failed', 'disabled'))");
    }
};