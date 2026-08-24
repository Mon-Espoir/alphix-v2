<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthenticationService
{
    /**
     * Create a new service instance.
     */
    public function __construct(protected UserRepository $userRepository)
    {
    }

    /**
     * Register a new user.
     */
    public function register(array $data): array
    {
        $userData = [
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ];

        /** @var User $user */
        $user = $this->userRepository->create($userData);
        $token = $user->createToken('auth-token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Authenticate a user and create a Sanctum token.
     */
    public function login(array $credentials): array
    {
        $user = $this->userRepository->findByEmail($credentials['email']);

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Revoke all tokens for the user.
     */
    public function logout(User $user): void
    {
        $user->tokens()->delete();
    }

    /**
     * Update user profile.
     */
    public function updateProfile(User $user, array $data): User
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        /** @var User */
        return $this->userRepository->update($user->id, $data);
    }
}
