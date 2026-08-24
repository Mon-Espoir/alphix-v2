<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Services\AuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(protected AuthenticationService $authService)
    {
    }

    /**
     * Handle register request.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $result['user'],
            'token' => $result['token'],
        ], 211); // Standard created response is 201, but we can also use 200 or 201. Let's use 201 for standard, or 201 as requested.
    }

    /**
     * Handle login request.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return response()->json([
            'message' => 'Login successful',
            'user' => $result['user'],
            'token' => $result['token'],
        ], 200);
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
     * Get the current authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
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
