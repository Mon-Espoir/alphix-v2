<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Form request for updating an existing semester.
 */
class UpdateSemesterRequest extends FormRequest
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
        $semesterId = $this->route('semester') ?? $this->route('id');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('semesters', 'name')->ignore($semesterId),
            ],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                Rule::unique('semesters', 'code')->ignore($semesterId),
            ],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('semesters', 'slug')->ignore($semesterId),
            ],
            'position' => ['sometimes', 'integer', 'min:0', 'max:65535'],
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
            'name.required' => 'Le nom du semestre est obligatoire.',
            'name.unique' => 'Ce nom de semestre est déjà utilisé.',
            'name.max' => 'Le nom ne peut pas dépasser :max caractères.',
            'code.required' => 'Le code du semestre est obligatoire.',
            'code.unique' => 'Ce code de semestre est déjà utilisé.',
            'code.max' => 'Le code ne peut pas dépasser :max caractères.',
            'slug.required' => 'Le slug du semestre est obligatoire.',
            'slug.unique' => 'Ce slug de semestre est déjà utilisé.',
            'slug.max' => 'Le slug ne peut pas dépasser :max caractères.',
            'position.integer' => 'La position doit être un entier.',
            'position.min' => 'La position ne peut pas être négative.',
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
            'position' => 'position',
            'status' => 'statut',
        ];
    }
}
