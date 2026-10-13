<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'username' => [
                'required', 'string', 'min:3', 'max:50',
                'regex:/^[a-z0-9][a-z0-9._-]*$/',
                'unique:users,username',
            ],
            'email' => 'nullable|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ];
    }

    /**
     * Get the custom validation messages.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Le nom complet est obligatoire.',
            'name.max' => 'Le nom complet ne peut pas dépasser :max caractères.',
            'username.required' => 'Le nom d\'utilisateur est obligatoire.',
            'username.min' => 'Le nom d\'utilisateur doit contenir au moins :min caractères.',
            'username.max' => 'Le nom d\'utilisateur ne peut pas dépasser :max caractères.',
            'username.regex' => 'Le nom d\'utilisateur ne peut contenir que des lettres minuscules, chiffres, points, tirets et underscores (3 à 50 caractères).',
            'username.unique' => 'Ce nom d\'utilisateur est déjà pris.',
            'email.email' => 'Cette adresse email n\'est pas valide.',
            'email.max' => 'L\'adresse email ne peut pas dépasser :max caractères.',
            'email.unique' => 'Un compte existe déjà avec cette adresse email.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins :min caractères.',
            'password.confirmed' => 'Les deux mots de passe ne correspondent pas.',
        ];
    }
}
