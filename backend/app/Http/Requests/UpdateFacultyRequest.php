<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFacultyRequest extends FormRequest
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
        $facultyId = $this->route('faculty') ?? $this->route('id');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('faculties', 'name')->ignore($facultyId),
            ],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                Rule::unique('faculties', 'code')->ignore($facultyId),
            ],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('faculties', 'slug')->ignore($facultyId),
            ],
            'description' => ['nullable', 'string'],
            'logo' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:30'],
            'icon' => ['nullable', 'string', 'max:100'],
            'drive_id' => ['nullable', 'integer', 'exists:google_drives,id'],
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
            'name.required' => 'Le nom de la faculté est obligatoire.',
            'name.unique' => 'Ce nom de faculté est déjà utilisé.',
            'code.required' => 'Le code de la faculté est obligatoire.',
            'code.unique' => 'Ce code de faculté est déjà utilisé.',
            'code.max' => 'Le code ne peut pas dépasser :max caractères.',
            'slug.required' => 'Le slug de la faculté est obligatoire.',
            'slug.unique' => 'Ce slug de faculté est déjà utilisé.',
            'drive_id.exists' => 'Le Google Drive sélectionné est invalide.',
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
            'name' => 'nom',
            'code' => 'code',
            'slug' => 'slug',
            'description' => 'description',
            'logo' => 'logo',
            'color' => 'couleur',
            'icon' => 'icône',
            'drive_id' => 'Google Drive',
            'status' => 'statut',
        ];
    }
}
