<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecognizeFaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'face_descriptor' => 'required|array|size:128',
            'face_descriptor.*' => 'required|numeric',
        ];
    }

    public function messages(): array
    {
        return [
            'face_descriptor.required' => 'Face descriptor wajib disertakan.',
            'face_descriptor.size' => 'Face descriptor harus memiliki 128 dimensi.',
        ];
    }
}
