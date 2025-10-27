<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Schema extends Model
{
    protected $fillable = [
        'hash',
        'kafka_topic',
        'pending_records',
        'name',
        'tenant_id',
        'sample_data',
        'detected_fields',
        'entity_mappings',
        'status',
        'type',
        'confirmed_at',
        'confirmed_by',
        'external_id_field',
        'dedupe_field',
        'ai_recommendations',
        'ai_analysis_status',
        'ai_analyzed_at',
        'ai_analysis_error',
    ];

    protected $casts = [
        'sample_data' => 'array',
        'detected_fields' => 'array',
        'entity_mappings' => 'array',
        'ai_recommendations' => 'array',
        'confirmed_at' => 'datetime',
        'ai_analyzed_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function confirm(User $user, ?string $name = null): void
    {
        $this->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'confirmed_by' => $user->id,
            'name' => $name ?? $this->name,
        ]);
    }

    public function reject(User $user): void
    {
        $this->update([
            'status' => 'rejected',
            'confirmed_at' => now(),
            'confirmed_by' => $user->id,
        ]);
    }

    /**
     * Get the schema mappings where this schema is the source
     */
    public function sourceMappings(): HasMany
    {
        return $this->hasMany(SchemaMapping::class, 'schema_id');
    }

    /**
     * Get the schema mappings where this schema is the target
     */
    public function targetMappings(): HasMany
    {
        return $this->hasMany(SchemaMapping::class, 'target_schema_id');
    }

    /**
     * Increment the pending records count for this schema
     */
    public function incrementPendingRecords(): void
    {
        $this->increment('pending_records');
    }
}
