<?php

namespace App\Repositories;

use App\Repositories\Contracts\RepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Abstract Eloquent repository providing shared data-access operations.
 */
abstract class BaseRepository implements RepositoryInterface
{
    /**
     * Create a new repository instance.
     */
    public function __construct(
        protected Model $model
    ) {
    }

    /**
     * {@inheritdoc}
     */
    public function all(): Collection
    {
        return $this->model->newQuery()->get();
    }

    /**
     * {@inheritdoc}
     */
    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()->find($id);
    }

    /**
     * {@inheritdoc}
     */
    public function findOrFail(int|string $id): Model
    {
        return $this->model->newQuery()->findOrFail($id);
    }

    /**
     * {@inheritdoc}
     */
    public function create(array $data): Model
    {
        return $this->model->newQuery()->create($data);
    }

    /**
     * {@inheritdoc}
     */
    public function update(int|string $id, array $data): Model
    {
        $record = $this->findOrFail($id);
        $record->update($data);

        return $record->fresh();
    }

    /**
     * {@inheritdoc}
     */
    public function delete(int|string $id): bool
    {
        $record = $this->findOrFail($id);

        return (bool) $record->delete();
    }

    /**
     * {@inheritdoc}
     */
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()->paginate($perPage);
    }

    /**
     * Expose a fresh query builder for the underlying model.
     */
    protected function query(): Builder
    {
        return $this->model->newQuery();
    }
}
