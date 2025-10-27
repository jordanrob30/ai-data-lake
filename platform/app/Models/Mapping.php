<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mapping extends Model
{
    protected $fillable = ['tenant_id'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
