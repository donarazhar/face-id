<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QrLoginSession extends Model
{
    protected $fillable = [
        'token',
        'app_id',
        'status',
        'employee_id',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
