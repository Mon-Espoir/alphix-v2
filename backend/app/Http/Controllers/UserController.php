<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    public function index(): AnonymousResourceCollection
    {
        $users = $this->userService->all();

        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        Gate::authorize('create', User::class);

        $user = $this->userService->create($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): UserResource
    {
        $user = $this->userService->find($id);

        return new UserResource($user);
    }

    public function update(UpdateUserRequest $request, int $id): UserResource
    {
        Gate::authorize('update', $this->userService->find($id));

        $user = $this->userService->update($id, $request->validated());

        return new UserResource($user);
    }

    public function destroy(int $id): JsonResponse
    {
        Gate::authorize('delete', $this->userService->find($id));

        $this->userService->delete($id);

        return response()->json(null, 204);
    }

    public function byEmail(string $email): UserResource
    {
        $user = $this->userService->findByEmail($email);

        return new UserResource($user);
    }

    public function byUuid(string $uuid): UserResource
    {
        $user = $this->userService->findByUuid($uuid);

        return new UserResource($user);
    }

    public function byRole(string $role): AnonymousResourceCollection
    {
        $users = $this->userService->byRole($role);

        return UserResource::collection($users);
    }

    /**
     * Reinitialisation du mot de passe (admin uniquement).
     * Si `password` est absent, un mot de passe temporaire est genere et
     * retourne UNE seule fois dans la reponse.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $target = $this->userService->find($id);

        if ($target === null) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        Gate::authorize('update', $target);

        $validated = $request->validate([
            'password' => ['nullable', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        $password = $validated['password'] ?? Str::password(12);

        $target->update(['password' => Hash::make($password)]);

        $target->tokens()->delete();

        return response()->json([
            'message' => 'Mot de passe reinitialise.',
            'data' => [
                'email' => $target->email,
                'username' => $target->username,
                'temporary_password' => isset($validated['password']) && $validated['password'] !== null ? null : $password,
            ],
        ]);
    }
}
