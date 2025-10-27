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
            $table->string('hash')->unique()->after('id');
            $table->string('name')->nullable()->after('hash');
            $table->string('tenant_id')->after('name');
            $table->json('sample_data')->after('tenant_id');
            $table->json('detected_fields')->after('sample_data');
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending')->after('detected_fields');
            $table->timestamp('confirmed_at')->nullable()->after('status');
            $table->unsignedBigInteger('confirmed_by')->nullable()->after('confirmed_at');
            
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('confirmed_by')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schemas', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['confirmed_by']);
            $table->dropColumn([
                'hash', 'name', 'tenant_id', 'sample_data', 
                'detected_fields', 'status', 'confirmed_at', 'confirmed_by'
            ]);
        });
    }
};