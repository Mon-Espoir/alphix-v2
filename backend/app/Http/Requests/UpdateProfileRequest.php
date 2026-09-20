<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
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
        $userId = $this->user()?->id;

        return [
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|min:3|max:50|regex:/^[a-zA-Z0-9._-]+$/|unique:users,username,' . $userId,
            'email' => 'sometimes|email|unique:users,email,' . $userId,
            'password' => 'sometimes|string|min:8|confirmed',
        ];
    }
}
