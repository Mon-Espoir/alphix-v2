<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for user domain operations.
 */
class UserService
{
    /**
     * @param  UserRepository  $userRepository  User data access
     */
    public function __construct(
        protected UserRepository $userRepository
    ) {
    }

    /**
     * Create a user.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->userRepository->create($data);
    }

    /**
     * Update a user.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->userRepository->update($id, $data);
    }

    /**
     * Delete a user.
     */
    public function delete(int $id): bool
    {
        return $this->userRepository->delete($id);
    }

    /**
     * Find a user by identifier.
     */
    public function find(int $id): ?Model
    {
        return $this->userRepository->find($id);
    }

    /**
     * Find a user by email.
     */
    public function findByEmail(string $email): ?User
    {
        return $this->userRepository->findByEmail($email);
    }

    /**
     * Find a user by UUID.
     */
    public function findByUuid(string $uuid): ?User
    {
        return $this->userRepository->findByUuid($uuid);
    }

    /**
     * Retrieve all users.
     *
     * @return Collection<int, Model>
     */
    public function all(): Collection
    {
        return $this->userRepository->all();
    }

    /**
     * Retrieve users by role.
     *
     * @return Collection<int, User>
     */
    public function byRole(string $role): Collection
    {
        return $this->userRepository->getByRole($role);
    }
}
