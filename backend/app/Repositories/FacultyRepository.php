<?php

namespace App\Repositories;

use App\Models\Faculty;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the faculties table.
 */
class FacultyRepository extends BaseRepository
{
    /**
     * Create a new faculty repository instance.
     */
    public function __construct(Faculty $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a faculty by its unique code.
     */
    public function findByCode(string $code): ?Faculty
    {
        /** @var Faculty|null */
        return $this->query()->where('code', $code)->first();
    }

    /**
     * Find a faculty by its unique slug.
     */
    public function findBySlug(string $slug): ?Faculty
    {
        /** @var Faculty|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Retrieve active faculties.
     *
     * @return Collection<int, Faculty>
     */
    public function getActive(): Collection
    {
        return $this->query()
            ->where('status', true)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve faculties with their departments relation.
     *
     * @return Collection<int, Faculty>
     */
    public function getWithDepartments(): Collection
    {
        return $this->query()
            ->with('departments')
            ->orderBy('name')
            ->get();
    }
}
