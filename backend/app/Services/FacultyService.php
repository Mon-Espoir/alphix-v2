<?php

namespace App\Services;

use App\Repositories\FacultyRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for faculty domain operations.
 */
class FacultyService
{
    /**
     * @param  FacultyRepository  $facultyRepository  Faculty data access
     */
    public function __construct(
        protected FacultyRepository $facultyRepository
    ) {
    }

    /**
     * Create a faculty.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->facultyRepository->create($data);
    }

    /**
     * Update a faculty.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->facultyRepository->update($id, $data);
    }

    /**
     * Delete a faculty.
     */
    public function delete(int $id): bool
    {
        return $this->facultyRepository->delete($id);
    }

    /**
     * Find a faculty by identifier.
     */
    public function find(int $id): ?Model
    {
        return $this->facultyRepository->find($id);
    }

    /**
     * Retrieve all faculties.
     *
     * @return Collection<int, Model>
     */
    public function all(): Collection
    {
        return $this->facultyRepository->all();
    }
}
