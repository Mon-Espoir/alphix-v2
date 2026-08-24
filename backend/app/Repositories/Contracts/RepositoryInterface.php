<?php

namespace App\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Base contract for ALPHIX data repositories.
 *
 * Encapsulates persistence operations without business logic.
 */
interface RepositoryInterface
{
    /**
     * Retrieve all records.
     *
     * @return Collection<int, Model>
     */
    public function all(): Collection;

    /**
     * Find a record by its primary key.
     */
    public function find(int|string $id): ?Model;

    /**
     * Find a record by its primary key or fail.
     */
    public function findOrFail(int|string $id): Model;

    /**
     * Persist a new record.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model;

    /**
     * Update an existing record.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int|string $id, array $data): Model;

    /**
     * Delete a record by its primary key.
     */
    public function delete(int|string $id): bool;

    /**
     * Paginate records.
     */
    public function paginate(int $perPage = 15): LengthAwarePaginator;
}
