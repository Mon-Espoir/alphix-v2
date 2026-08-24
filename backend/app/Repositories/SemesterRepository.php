<?php

namespace App\Repositories;

use App\Models\Semester;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the semesters table.
 */
class SemesterRepository extends BaseRepository
{
    /**
     * Create a new semester repository instance.
     */
    public function __construct(Semester $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a semester by its unique code.
     */
    public function findByCode(string $code): ?Semester
    {
        /** @var Semester|null */
        return $this->query()->where('code', $code)->first();
    }

    /**
     * Find a semester by its unique slug.
     */
    public function findBySlug(string $slug): ?Semester
    {
        /** @var Semester|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Retrieve active semesters ordered by position.
     *
     * @return Collection<int, Semester>
     */
    public function getActiveOrdered(): Collection
    {
        return $this->query()
            ->where('status', true)
            ->orderBy('position')
            ->get();
    }
}
