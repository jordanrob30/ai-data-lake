<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchemaMapping extends Model
{
    protected $table = 'schema_mappings';
    
    protected $fillable = [
        'schema_id',
        'target_schema_id',
        'field_path',
        'is_array',
        'mapping_definition',
        'mapping_type',
        'formula_expression',
        'formula_language',
    ];

    protected $casts = [
        'is_array' => 'boolean',
        'mapping_definition' => 'array',
    ];

    /**
     * Get the source schema that this mapping belongs to
     */
    public function sourceSchema(): BelongsTo
    {
        return $this->belongsTo(Schema::class, 'schema_id');
    }

    /**
     * Get the target schema that this mapping references
     */
    public function targetSchema(): BelongsTo
    {
        return $this->belongsTo(Schema::class, 'target_schema_id');
    }
}
