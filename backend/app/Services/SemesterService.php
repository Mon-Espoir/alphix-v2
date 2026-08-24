<?php

namespace App\Services;

use App\Models\Semester;
use App\Repositories\SemesterRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for academic semester domain operations.
 */
class SemesterService
{
    /**
     * @param  SemesterRepository  $semesterRepository  Semester data access
     */
    public function __construct(
        protected SemesterRepository $semesterRepository
    ) {
    }

    /**
     * Create a semester.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->semesterRepository->create($data);
    }

    /**
     * Update a semester.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->semesterRepository->update($id, $data);
    }

    /**
     * Delete a semester.
     */
    public function delete(int $id): bool
    {
        return $this->semesterRepository->delete($id);
    }

    /**
     * Find a semester by identifier.
     */
    public function find(int $id): ?Model
    {
        return $this->semesterRepository->find($id);
    }

    /**
     * Retrieve all semesters.
     *
     * @return Collection<int, Model>
     */
    public function all(): Collection
    {
        return $this->semesterRepository->all();
    }

    /**
     * Retrieve active semesters ordered by position.
     *
     * @return Collection<int, Semester>
     */
    public function activeOrdered(): Collection
    {
        return $this->semesterRepository->getActiveOrdered();
    }
}
