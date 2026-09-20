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
     * Find a user by exact email address.
     */
    public function findByEmail(string $email): ?User
    {
        return $this->query()->where('email', $email)->whereNotNull('email')->first();
    }

    /**
     * Find a user by exact username (insensible a la casse normalisee).
     */
    public function findByUsername(string $username): ?User
    {
        return $this->query()->where('username', $username)->whereNotNull('username')->first();
    }

    /**
     * Find a user by login identifier : nom d'utilisateur OU adresse email.
     * Les noms d'utilisateur sont stockes en minuscules (insensibles a la casse),
     * l'email reste compare exactement pour ne pas casser les comptes existants.
     */
    public function findByIdentifier(string $identifier): ?User
    {
        $username = strtolower(trim($identifier));

        /** @var User|null */
        return $this->query()
            ->where(function ($query) use ($identifier, $username) {
                $query->where('username', $username)
                    ->orWhere('email', $identifier);
            })
            ->first();
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
