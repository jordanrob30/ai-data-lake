<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasUuids;

    protected $fillable = [
        'id',
        'name',
    ];
    public $incrementing = false;

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
