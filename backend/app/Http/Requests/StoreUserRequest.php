<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Form request for creating a new user.
 */
class StoreUserRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-zA-Z0-9._-]+$/',
                'unique:users,username',
            ],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
            'role' => [
                'sometimes',
                'string',
                Rule::in(['student', 'teacher', 'contributor', 'moderator', 'administrator', 'super_admin', 'delegate']),
            ],
            'faculty_id' => ['nullable', 'integer', 'exists:faculties,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'level_id' => ['nullable', 'integer', 'exists:levels,id'],
            'avatar' => ['nullable', 'string', 'max:255'],
            'language' => ['sometimes', 'string', 'max:20'],
            'theme' => ['sometimes', 'string', Rule::in(['light', 'dark', 'system'])],
            'notification_enabled' => ['sometimes', 'boolean'],
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
            'name.required' => 'Le nom est obligatoire.',
            'name.max' => 'Le nom ne peut pas dépasser :max caractères.',
            'username.required' => 'Le nom d\'utilisateur est obligatoire.',
            'username.min' => 'Le nom d\'utilisateur doit contenir au moins :min caractères.',
            'username.max' => 'Le nom d\'utilisateur ne peut pas dépasser :max caractères.',
            'username.regex' => 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et underscores.',
            'username.unique' => 'Ce nom d\'utilisateur est déjà pris.',
            'email.email' => 'L\'adresse e-mail n\'est pas valide.',
            'email.unique' => 'Cette adresse e-mail est déjà utilisée.',
            'email.max' => 'L\'adresse e-mail ne peut pas dépasser :max caractères.',
            'phone.max' => 'Le numéro de téléphone ne peut pas dépasser :max caractères.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins :min caractères.',
            'password.max' => 'Le mot de passe ne peut pas dépasser :max caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'role.in' => 'Le rôle sélectionné est invalide.',
            'faculty_id.exists' => 'La faculté sélectionnée est invalide.',
            'department_id.exists' => 'Le département sélectionné est invalide.',
            'level_id.exists' => 'Le niveau sélectionné est invalide.',
            'language.max' => 'Le code de langue ne peut pas dépasser :max caractères.',
            'theme.in' => 'Le thème sélectionné est invalide.',
            'notification_enabled.boolean' => 'La notification doit être vraie ou fausse.',
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
            'username' => 'nom d\'utilisateur',
            'email' => 'adresse e-mail',
            'phone' => 'téléphone',
            'password' => 'mot de passe',
            'role' => 'rôle',
            'faculty_id' => 'faculté',
            'department_id' => 'département',
            'level_id' => 'niveau',
            'avatar' => 'avatar',
            'language' => 'langue',
            'theme' => 'thème',
            'notification_enabled' => 'notification',
            'status' => 'statut',
        ];
    }
}
