<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDepartmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $departmentId = $this->route('department') ?? $this->route('id');

        return [
            'faculty_id' => ['sometimes', 'required', 'integer', 'exists:faculties,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                Rule::unique('departments', 'code')->ignore($departmentId),
            ],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('departments', 'slug')->ignore($departmentId),
            ],
            'short_name' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'logo' => ['nullable', 'string', 'max:255'],
            'banner' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:30'],
            'icon' => ['nullable', 'string', 'max:100'],
            'drive_id' => ['nullable', 'integer', 'exists:google_drives,id'],
            'is_public' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get the custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'faculty_id.required' => 'La faculté est obligatoire.',
            'faculty_id.exists' => 'La faculté sélectionnée est invalide.',
            'name.required' => 'Le nom du département est obligatoire.',
            'code.required' => 'Le code du département est obligatoire.',
            'code.unique' => 'Ce code de département est déjà utilisé.',
            'slug.required' => 'Le slug du département est obligatoire.',
            'slug.unique' => 'Ce slug de département est déjà utilisé.',
            'drive_id.exists' => 'Le Google Drive sélectionné est invalide.',
            'is_public.boolean' => 'La visibilité publique doit être vraie ou fausse.',
            'status.boolean' => 'Le statut doit être vrai ou faux.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'faculty_id' => 'faculté',
            'name' => 'nom',
            'code' => 'code',
            'slug' => 'slug',
            'short_name' => 'nom court',
            'description' => 'description',
            'logo' => 'logo',
            'banner' => 'bannière',
            'color' => 'couleur',
            'icon' => 'icône',
            'drive_id' => 'Google Drive',
            'is_public' => 'visibilité publique',
            'status' => 'statut',
        ];
    }
}
