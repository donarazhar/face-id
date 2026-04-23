<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee' => [
                'id' => $this->employee->id,
                'nip' => $this->employee->nip,
                'nama' => $this->employee->nama,
                'jabatan' => $this->employee->jabatan,
                'photo_thumbnail' => $this->employee->photo_thumbnail,
            ],
            'check_in_time' => $this->check_in_time?->toIso8601String(),
            'check_out_time' => $this->check_out_time?->toIso8601String(),
            'status' => $this->status,
            'confidence_score' => $this->confidence_score,
            'method' => $this->method,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
