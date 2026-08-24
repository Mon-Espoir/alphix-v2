<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourseRequest extends FormRequest
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
        $courseId = $this->route('course') ?? $this->route('id');

        return [
            'department_id' => ['sometimes', 'required', 'integer', 'exists:departments,id'],
            'level_id' => ['sometimes', 'required', 'integer', 'exists:levels,id'],
            'semester_id' => ['sometimes', 'required', 'integer', 'exists:semesters,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('courses', 'code')->ignore($courseId),
            ],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('courses', 'slug')->ignore($courseId),
            ],
            'description' => ['nullable', 'string'],
            'credits' => ['nullable', 'integer', 'min:0', 'max:32767'],
            'coefficient' => ['nullable', 'numeric', 'min:0', 'max:99.99'],
            'hours' => ['nullable', 'integer', 'min:0', 'max:32767'],
            'teacher' => ['nullable', 'string', 'max:255'],
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
            'department_id.required' => 'Le département est obligatoire.',
            'department_id.exists' => 'Le département sélectionné est invalide.',
            'level_id.required' => 'Le niveau académique est obligatoire.',
            'level_id.exists' => 'Le niveau académique sélectionné est invalide.',
            'semester_id.required' => 'Le semestre est obligatoire.',
            'semester_id.exists' => 'Le semestre sélectionné est invalide.',
            'name.required' => 'Le nom du cours est obligatoire.',
            'code.required' => 'Le code du cours est obligatoire.',
            'code.unique' => 'Ce code de cours est déjà utilisé.',
            'slug.required' => 'Le slug du cours est obligatoire.',
            'slug.unique' => 'Ce slug de cours est déjà utilisé.',
            'credits.integer' => 'Le nombre de crédits doit être un entier.',
            'coefficient.numeric' => 'Le coefficient doit être numérique.',
            'hours.integer' => 'Le volume horaire doit être un entier.',
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
            'department_id' => 'département',
            'level_id' => 'niveau',
            'semester_id' => 'semestre',
            'name' => 'nom',
            'code' => 'code',
            'slug' => 'slug',
            'description' => 'description',
            'credits' => 'crédits',
            'coefficient' => 'coefficient',
            'hours' => 'heures',
            'teacher' => 'enseignant',
            'color' => 'couleur',
            'icon' => 'icône',
            'drive_id' => 'Google Drive',
            'status' => 'statut',
        ];
    }
}
