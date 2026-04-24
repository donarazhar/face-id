<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nip' => $this->nip,
            'nama' => $this->nama,
            'jabatan' => $this->jabatan,
            'has_face' => $this->hasFaceRegistered(),
            'face_registered_at' => $this->face_registered_at?->toIso8601String(),
            'photo_thumbnail' => $this->photo_thumbnail,
            'is_active' => $this->is_active,
            'branch_id' => $this->branch_id,
            'branch' => $this->branch,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
