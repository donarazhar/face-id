<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SsoApp extends Model
{
    use HasFactory;

    protected $fillable = [
        'app_name',
        'api_key',
        'is_active',
        'last_called_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_called_at' => 'datetime',
    ];
}
