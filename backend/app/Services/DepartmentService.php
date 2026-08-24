<?php

namespace App\Services;

use App\Models\Department;
use App\Repositories\DepartmentRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for department domain operations.
 */
class DepartmentService
{
    /**
     * @param  DepartmentRepository  $departmentRepository  Department data access
     */
    public function __construct(
        protected DepartmentRepository $departmentRepository
    ) {
    }

    /**
     * Create a department.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->departmentRepository->create($data);
    }

    /**
     * Update a department.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->departmentRepository->update($id, $data);
    }

    /**
     * Delete a department.
     */
    public function delete(int $id): bool
    {
        return $this->departmentRepository->delete($id);
    }

    /**
     * Find a department by identifier.
     */
    public function find(int $id): ?Model
    {
        return $this->departmentRepository->find($id);
    }

    /**
     * Retrieve departments belonging to a faculty.
     *
     * @return Collection<int, Department>
     */
    public function byFaculty(int $facultyId): Collection
    {
        return $this->departmentRepository->getByFacultyId($facultyId);
    }
}
