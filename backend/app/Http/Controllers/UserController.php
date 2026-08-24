<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $users = $this->userService->all();

        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
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
        $user = $this->userService->update($id, $request->validated());

        return new UserResource($user);
    }

    public function destroy(int $id): JsonResponse
    {
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
}
