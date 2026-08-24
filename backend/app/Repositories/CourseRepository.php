<?php

namespace App\Repositories;

use App\Models\Course;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the courses table.
 */
class CourseRepository extends BaseRepository
{
    /**
     * Create a new course repository instance.
     */
    public function __construct(Course $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a course by its unique code.
     */
    public function findByCode(string $code): ?Course
    {
        /** @var Course|null */
        return $this->query()->where('code', $code)->first();
    }

    /**
     * Find a course by its unique slug.
     */
    public function findBySlug(string $slug): ?Course
    {
        /** @var Course|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Retrieve courses for a given department.
     *
     * @return Collection<int, Course>
     */
    public function getByDepartmentId(int $departmentId): Collection
    {
        return $this->query()
            ->where('department_id', $departmentId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve courses for a given level.
     *
     * @return Collection<int, Course>
     */
    public function getByLevelId(int $levelId): Collection
    {
        return $this->query()
            ->where('level_id', $levelId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve courses for a given semester.
     *
     * @return Collection<int, Course>
     */
    public function getBySemesterId(int $semesterId): Collection
    {
        return $this->query()
            ->where('semester_id', $semesterId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve active courses.
     *
     * @return Collection<int, Course>
     */
    public function getActive(): Collection
    {
        return $this->query()
            ->where('status', true)
            ->orderBy('name')
            ->get();
    }
}
