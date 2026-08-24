<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Form request for updating an existing document.
 */
class UpdateDocumentRequest extends FormRequest
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
        $documentId = $this->route('document') ?? $this->route('id');

        return [
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'google_drive_id' => ['nullable', 'integer', 'exists:google_drives,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'doc_type' => [
                'sometimes',
                'required',
                'string',
                Rule::in([
                    'course', 'tp', 'td', 'exam', 'correction', 'syllabus',
                    'summary', 'book', 'thesis', 'report', 'presentation',
                    'video', 'external_link', 'other',
                ]),
            ],
            'academic_year' => ['nullable', 'string', 'max:20'],
            'language' => ['sometimes', 'string', 'max:20'],
            'mime_type' => ['sometimes', 'string', 'max:100'],
            'pages' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'file_size' => ['sometimes', 'integer', 'min:0'],
            'version' => ['sometimes', 'string', 'max:30'],
            'visibility' => [
                'sometimes',
                'string',
                Rule::in(['public', 'faculty', 'department', 'private']),
            ],
            'status' => [
                'sometimes',
                'string',
                Rule::in(['pending', 'processing', 'approved', 'rejected', 'archived']),
            ],
            'is_featured' => ['sometimes', 'boolean'],
            'metadata' => ['nullable', 'array'],
            'metadata.*' => ['string'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['integer', 'exists:document_tags,id'],
            'published_at' => ['nullable', 'date'],
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
            'title.required' => 'Le titre du document est obligatoire.',
            'title.max' => 'Le titre ne peut pas dépasser :max caractères.',
            'doc_type.required' => 'Le type de document est obligatoire.',
            'doc_type.in' => 'Le type de document sélectionné est invalide.',
            'academic_year.max' => 'L\'année académique ne peut pas dépasser :max caractères.',
            'language.max' => 'La langue ne peut pas dépasser :max caractères.',
            'mime_type.max' => 'Le type MIME ne peut pas dépasser :max caractères.',
            'pages.integer' => 'Le nombre de pages doit être un entier.',
            'pages.min' => 'Le nombre de pages doit être au moins :min.',
            'file_size.min' => 'La taille du fichier ne peut pas être négative.',
            'version.max' => 'La version ne peut pas dépasser :max caractères.',
            'visibility.in' => 'La visibilité sélectionnée est invalide.',
            'status.in' => 'Le statut sélectionné est invalide.',
            'is_featured.boolean' => 'La mise en avant doit être vraie ou fausse.',
            'metadata.array' => 'Les métadonnées doivent être un tableau.',
            'tags.array' => 'Les tags doivent être un tableau.',
            'tags.*.exists' => 'Le tag sélectionné est invalide.',
            'published_at.date' => 'La date de publication n\'est pas valide.',
            'course_id.exists' => 'Le cours sélectionné est invalide.',
            'google_drive_id.exists' => 'Le Google Drive sélectionné est invalide.',
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
            'course_id' => 'cours',
            'google_drive_id' => 'Google Drive',
            'title' => 'titre',
            'description' => 'description',
            'doc_type' => 'type de document',
            'academic_year' => 'année académique',
            'language' => 'langue',
            'mime_type' => 'type MIME',
            'pages' => 'pages',
            'file_size' => 'taille du fichier',
            'version' => 'version',
            'visibility' => 'visibilité',
            'status' => 'statut',
            'is_featured' => 'mise en avant',
            'metadata' => 'métadonnées',
            'tags' => 'tags',
            'published_at' => 'date de publication',
        ];
    }
}
