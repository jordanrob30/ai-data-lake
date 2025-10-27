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
            $table->unsignedBigInteger('pending_records')->default(0)->after('kafka_topic');
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schemas', function (Blueprint $table) {
            $table->dropColumn('pending_records');
        });
    }
};
