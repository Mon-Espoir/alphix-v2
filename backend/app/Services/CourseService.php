<?php

namespace App\Services;

use App\Models\Course;
use App\Repositories\CourseRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for course domain operations.
 */
class CourseService
{
    /**
     * @param  CourseRepository  $courseRepository  Course data access
     */
    public function __construct(
        protected CourseRepository $courseRepository
    ) {
    }

    public function find(int $id): Model
    {
        return $this->courseRepository->findOrFail($id);
    }

    /**
     * Create a course.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->courseRepository->create($data);
    }

    /**
     * Update a course.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->courseRepository->update($id, $data);
    }

    /**
     * Delete a course.
     */
    public function delete(int $id): bool
    {
        return $this->courseRepository->delete($id);
    }

    /**
     * Retrieve courses for a department.
     *
     * @return Collection<int, Course>
     */
    public function byDepartment(int $departmentId): Collection
    {
        return $this->courseRepository->getByDepartmentId($departmentId);
    }

    /**
     * Retrieve courses for a semester.
     *
     * @return Collection<int, Course>
     */
    public function bySemester(int $semesterId): Collection
    {
        return $this->courseRepository->getBySemesterId($semesterId);
    }

    /**
     * Retrieve courses for a level.
     *
     * @return Collection<int, Course>
     */
    public function byLevel(int $levelId): Collection
    {
        return $this->courseRepository->getByLevelId($levelId);
    }

    /**
     * Retrieve all courses with real document counts (LEFT JOIN).
     *
     * @return Collection<int, Course>
     */
    public function allWithDocumentCounts(): Collection
    {
        return $this->courseRepository->getAllWithDocumentCounts();
    }

    /**
     * Search courses with document counts.
     *
     * @return Collection<int, Course>
     */
    public function searchWithDocumentCounts(string $term): Collection
    {
        return $this->courseRepository->searchWithDocumentCounts($term);
    }
}
