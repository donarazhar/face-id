<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\HasApiTokens;

class Employee extends Model
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'nip',
        'nama',
        'jabatan',
        'face_descriptor',
        'face_registered_at',
        'photo_thumbnail',
        'is_active',
        'branch_id',
    ];

    protected $casts = [
        'face_descriptor' => 'array',
        'face_registered_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Get attendance logs for this employee.
     */
    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class);
    }

    /**
     * Get the branch that owns the employee.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Check if this employee has a registered face.
     */
    public function hasFaceRegistered(): bool
    {
        return !is_null($this->face_descriptor) && !empty($this->face_descriptor);
    }

    /**
     * Scope: only employees with registered faces.
     */
    public function scopeWithFace($query)
    {
        return $query->whereNotNull('face_descriptor');
    }

    /**
     * Scope: only active employees.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
