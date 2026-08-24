<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Form request for updating an existing document tag.
 */
class UpdateDocumentTagRequest extends FormRequest
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
        $tagId = $this->route('documentTag') ?? $this->route('id');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('document_tags', 'name')->ignore($tagId),
            ],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('document_tags', 'slug')->ignore($tagId),
            ],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:30'],
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
            'name.required' => 'Le nom du tag est obligatoire.',
            'name.unique' => 'Ce nom de tag est déjà utilisé.',
            'name.max' => 'Le nom ne peut pas dépasser :max caractères.',
            'slug.required' => 'Le slug du tag est obligatoire.',
            'slug.unique' => 'Ce slug de tag est déjà utilisé.',
            'slug.max' => 'Le slug ne peut pas dépasser :max caractères.',
            'color.max' => 'La couleur ne peut pas dépasser :max caractères.',
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
            'slug' => 'slug',
            'description' => 'description',
            'color' => 'couleur',
        ];
    }
}
