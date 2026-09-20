<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
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
            'identifier' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'login' => ['sometimes', 'required', 'string', 'max:255'],
            'password' => 'required|string',
        ];
    }

    /**
     * Identifiant fusionne : `identifier` (nom d'utilisateur OU email) sinon
     * `email` puis `login` (compatibilite avec les anciens/multiples clients).
     */
    public function identifier(): ?string
    {
        return $this->input('identifier') ?? $this->input('email') ?? $this->input('login');
    }
}
