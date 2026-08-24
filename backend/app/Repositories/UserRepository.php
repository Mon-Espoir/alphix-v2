<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the users table.
 */
class UserRepository extends BaseRepository
{
    /**
     * Create a new user repository instance.
     */
    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a user by email address.
     */
    public function findByEmail(string $email): ?User
    {
        /** @var User|null */
        return $this->query()->where('email', $email)->first();
    }

    /**
     * Find a user by public UUID.
     */
    public function findByUuid(string $uuid): ?User
    {
        /** @var User|null */
        return $this->query()->where('uuid', $uuid)->first();
    }

    /**
     * Retrieve users filtered by role.
     *
     * @return Collection<int, User>
     */
    public function getByRole(string $role): Collection
    {
        return $this->query()
            ->where('role', $role)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve users belonging to a faculty.
     *
     * @return Collection<int, User>
     */
    public function getByFacultyId(int $facultyId): Collection
    {
        return $this->query()
            ->where('faculty_id', $facultyId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve users belonging to a department.
     *
     * @return Collection<int, User>
     */
    public function getByDepartmentId(int $departmentId): Collection
    {
        return $this->query()
            ->where('department_id', $departmentId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve active users.
     *
     * @return Collection<int, User>
     */
    public function getActive(): Collection
    {
        return $this->query()
            ->where('status', true)
            ->orderBy('name')
            ->get();
    }
}
