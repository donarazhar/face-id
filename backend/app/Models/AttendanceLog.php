<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'check_in_time',
        'check_out_time',
        'status',
        'confidence_score',
        'method',
    ];

    protected $casts = [
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'confidence_score' => 'decimal:4',
    ];

    /**
     * Get the employee that owns this log.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Scope: today's attendance.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('check_in_time', today());
    }
}
