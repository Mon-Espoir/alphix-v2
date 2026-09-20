<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Form request for searching documents.
 */
class SearchDocumentRequest extends FormRequest
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
            'query' => ['required', 'string', 'max:255'],
            'faculty_id' => ['nullable', 'integer', 'exists:faculties,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'doc_type' => [
                'nullable',
                'string',
                Rule::in([
                    'course', 'tp', 'td', 'exam', 'correction', 'syllabus',
                    'summary', 'book', 'thesis', 'report', 'presentation',
                    'video', 'external_link', 'other',
                ]),
            ],
            'academic_year' => ['nullable', 'string', 'max:20'],
            'language' => ['nullable', 'string', 'max:20'],
            'visibility' => [
                'nullable',
                'string',
                Rule::in(['public', 'faculty', 'department', 'private']),
            ],
            'sort' => ['nullable', 'string', Rule::in(['relevance', 'date', 'title', 'downloads'])],
            'order' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
            'min_downloads' => ['nullable', 'integer', 'min:0'],
            'min_views' => ['nullable', 'integer', 'min:0'],
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
            'query.required' => 'La requête de recherche est obligatoire.',
            'query.max' => 'La requête ne peut pas dépasser :max caractères.',
            'faculty_id.exists' => 'La faculté sélectionnée est invalide.',
            'department_id.exists' => 'Le département sélectionné est invalide.',
            'doc_type.in' => 'Le type de document sélectionné est invalide.',
            'academic_year.max' => 'L\'année académique ne peut pas dépasser :max caractères.',
            'language.max' => 'La langue ne peut pas dépasser :max caractères.',
            'visibility.in' => 'La visibilité sélectionnée est invalide.',
            'sort.in' => 'Le critère de tri sélectionné est invalide.',
            'order.in' => 'L\'ordre de tri sélectionné est invalide.',
            'per_page.min' => 'Le nombre d\'éléments par page doit être au moins :min.',
            'per_page.max' => 'Le nombre d\'éléments par page ne peut pas dépasser :max.',
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
            'query' => 'requête',
            'faculty_id' => 'faculté',
            'department_id' => 'département',
            'doc_type' => 'type de document',
            'academic_year' => 'année académique',
            'language' => 'langue',
            'visibility' => 'visibilité',
            'sort' => 'tri',
            'order' => 'ordre',
            'per_page' => 'éléments par page',
        ];
    }
}
