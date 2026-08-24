<?php

namespace App\Services;

use App\Models\Level;
use App\Repositories\LevelRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for academic level domain operations.
 */
class LevelService
{
    /**
     * @param  LevelRepository  $levelRepository  Level data access
     */
    public function __construct(
        protected LevelRepository $levelRepository
    ) {
    }

    /**
     * Create a level.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->levelRepository->create($data);
    }

    /**
     * Update a level.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->levelRepository->update($id, $data);
    }

    /**
     * Delete a level.
     */
    public function delete(int $id): bool
    {
        return $this->levelRepository->delete($id);
    }

    /**
     * Find a level by identifier.
     */
    public function find(int $id): ?Model
    {
        return $this->levelRepository->find($id);
    }

    /**
     * Retrieve all levels.
     *
     * @return Collection<int, Model>
     */
    public function all(): Collection
    {
        return $this->levelRepository->all();
    }

    /**
     * Retrieve active levels ordered by position.
     *
     * @return Collection<int, Level>
     */
    public function activeOrdered(): Collection
    {
        return $this->levelRepository->getActiveOrdered();
    }
}
