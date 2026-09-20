<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Services\AuthenticationService;
use App\Services\SystemLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected AuthenticationService $authService,
        protected SystemLogService $systemLogService
    ) {}

    /**
     * Handle register request.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        // Audit: register success (NEVER log passwords)
        try {
            $this->systemLogService->logAuth($request, 'auth.register.success', 'success', $request->validated()['email'] ?? null, [
                'user_id' => $result['user']->id ?? null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $result['user'],
            'token' => $result['token'],
        ], 211);
    }

    /**
     * Handle login request.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login($request->validated());

            try {
                $this->systemLogService->logAuth($request, 'auth.login.success', 'success', $request->validated()['email'] ?? null, [
                    'user_id' => $result['user']->id ?? null,
                ]);
            } catch (\Throwable $e) {
                report($e);
            }

            return response()->json([
                'message' => 'Login successful',
                'user' => $result['user'],
                'token' => $result['token'],
            ], 200);
        } catch (\Throwable $e) {
            // Audit: login failure (NEVER log password)
            try {
                $this->systemLogService->logAuth($request, 'auth.login.failure', 'failure', $request->validated()['email'] ?? $request->input('email'), [
                    'error' => $e->getMessage(),
                ]);
            } catch (\Throwable $inner) {
                report($inner);
            }
            throw $e;
        }
    }

    /**
     * Handle logout request.
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'message' => 'Logged out successfully',
        ], 200);
    }

    /**
     * Get the current authenticated user (avec compteur de depots approuves
     * pour la gamification, sans migration ni requete supplementaire cote client).
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user !== null) {
            $user->loadCount([
                'documents as uploads_count' => fn ($q) => $q->where('status', 'approved'),
            ]);
        }

        return response()->json([
            'user' => $user,
        ], 200);
    }

    /**
     * Update current user profile.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $updatedUser = $this->authService->updateProfile($request->user(), $request->validated());

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $updatedUser,
        ], 200);
    }
}
