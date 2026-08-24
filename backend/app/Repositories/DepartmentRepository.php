<?php

namespace App\Repositories;

use App\Models\Department;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the departments table.
 */
class DepartmentRepository extends BaseRepository
{
    /**
     * Create a new department repository instance.
     */
    public function __construct(Department $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a department by its unique code.
     */
    public function findByCode(string $code): ?Department
    {
        /** @var Department|null */
        return $this->query()->where('code', $code)->first();
    }

    /**
     * Find a department by its unique slug.
     */
    public function findBySlug(string $slug): ?Department
    {
        /** @var Department|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Retrieve departments belonging to a faculty.
     *
     * @return Collection<int, Department>
     */
    public function getByFacultyId(int $facultyId): Collection
    {
        return $this->query()
            ->where('faculty_id', $facultyId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve active departments.
     *
     * @return Collection<int, Department>
     */
    public function getActive(): Collection
    {
        return $this->query()
            ->where('status', true)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve public and active departments.
     *
     * @return Collection<int, Department>
     */
    public function getPublic(): Collection
    {
        return $this->query()
            ->where('is_public', true)
            ->where('status', true)
            ->orderBy('name')
            ->get();
    }
}
