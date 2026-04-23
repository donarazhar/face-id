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
        return [
            'nip' => 'sometimes|string|max:20|unique:employees,nip,' . $this->route('employee'),
            'nama' => 'sometimes|string|max:100',
            'jabatan' => 'nullable|string|max:100',
        ];
    }
}
