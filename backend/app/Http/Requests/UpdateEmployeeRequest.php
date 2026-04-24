<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $employeeId = $this->route('employee') ? $this->route('employee')->id : null;
        
        return [
            'nip' => 'sometimes|string|max:20|unique:employees,nip,' . $employeeId,
            'nama' => 'sometimes|string|max:100',
            'jabatan' => 'nullable|string|max:100',
            'is_active' => 'boolean',
            'branch_id' => 'nullable|exists:branches,id',
        ];
    }
}
