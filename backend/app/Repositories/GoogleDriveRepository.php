<?php

namespace App\Repositories;

use App\Models\GoogleDrive;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the google_drives table.
 */
class GoogleDriveRepository extends BaseRepository
{
    /**
     * Create a new Google Drive repository instance.
     */
    public function __construct(GoogleDrive $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a Google Drive account by its unique code.
     */
    public function findByCode(string $code): ?GoogleDrive
    {
        /** @var GoogleDrive|null */
        return $this->query()->where('code', $code)->first();
    }

    /**
     * Find a Google Drive account by its public UUID.
     */
    public function findByUuid(string $uuid): ?GoogleDrive
    {
        /** @var GoogleDrive|null */
        return $this->query()->where('uuid', $uuid)->first();
    }

    /**
     * Find a Google Drive account by its folder identifier.
     */
    public function findByFolderId(string $folderId): ?GoogleDrive
    {
        /** @var GoogleDrive|null */
        return $this->query()->where('folder_id', $folderId)->first();
    }

    /**
     * Retrieve the default Google Drive account.
     */
    public function getDefault(): ?GoogleDrive
    {
        /** @var GoogleDrive|null */
        return $this->query()
            ->where('is_default', true)
            ->where('status', true)
            ->first();
    }

    /**
     * Retrieve active Google Drive accounts ordered by priority.
     *
     * @return Collection<int, GoogleDrive>
     */
    public function getActiveByPriority(): Collection
    {
        return $this->query()
            ->where('status', true)
            ->orderBy('priority')
            ->get();
    }
}
