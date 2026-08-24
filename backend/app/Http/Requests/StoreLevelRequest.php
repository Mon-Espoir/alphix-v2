<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for creating a new academic level.
 */
class StoreLevelRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:100', 'unique:levels,name'],
            'code' => ['required', 'string', 'max:30', 'unique:levels,code'],
            'slug' => ['required', 'string', 'max:100', 'unique:levels,slug'],
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
            'name.required' => 'Le nom du niveau est obligatoire.',
            'name.unique' => 'Ce nom de niveau est déjà utilisé.',
            'name.max' => 'Le nom ne peut pas dépasser :max caractères.',
            'code.required' => 'Le code du niveau est obligatoire.',
            'code.unique' => 'Ce code de niveau est déjà utilisé.',
            'code.max' => 'Le code ne peut pas dépasser :max caractères.',
            'slug.required' => 'Le slug du niveau est obligatoire.',
            'slug.unique' => 'Ce slug de niveau est déjà utilisé.',
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
