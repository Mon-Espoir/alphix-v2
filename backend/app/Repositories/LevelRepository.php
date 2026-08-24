<?php

namespace App\Repositories;

use App\Models\Level;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the levels table.
 */
class LevelRepository extends BaseRepository
{
    /**
     * Create a new level repository instance.
     */
    public function __construct(Level $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a level by its unique code.
     */
    public function findByCode(string $code): ?Level
    {
        /** @var Level|null */
        return $this->query()->where('code', $code)->first();
    }

    /**
     * Find a level by its unique slug.
     */
    public function findBySlug(string $slug): ?Level
    {
        /** @var Level|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Retrieve active levels ordered by position.
     *
     * @return Collection<int, Level>
     */
    public function getActiveOrdered(): Collection
    {
        return $this->query()
            ->where('status', true)
            ->orderBy('position')
            ->get();
    }
}
