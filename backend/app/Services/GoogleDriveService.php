<?php

namespace App\Services;

use App\Models\GoogleDrive;
use App\Repositories\GoogleDriveRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for Google Drive storage domain operations.
 */
class GoogleDriveService
{
    /**
     * @param  GoogleDriveRepository  $googleDriveRepository  Google Drive data access
     */
    public function __construct(
        protected GoogleDriveRepository $googleDriveRepository
    ) {
    }

    /**
     * Create a Google Drive account.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->googleDriveRepository->create($data);
    }

    /**
     * Update a Google Drive account.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->googleDriveRepository->update($id, $data);
    }

    /**
     * Delete a Google Drive account.
     */
    public function delete(int $id): bool
    {
        return $this->googleDriveRepository->delete($id);
    }

    /**
     * Find a Google Drive account by identifier.
     */
    public function find(int $id): ?Model
    {
        return $this->googleDriveRepository->find($id);
    }

    /**
     * Retrieve all Google Drive accounts.
     *
     * @return Collection<int, Model>
     */
    public function all(): Collection
    {
        return $this->googleDriveRepository->all();
    }

    /**
     * Retrieve the default Google Drive account.
     */
    public function defaultDrive(): ?GoogleDrive
    {
        return $this->googleDriveRepository->getDefault();
    }

    /**
     * Retrieve active Google Drive accounts ordered by priority.
     *
     * @return Collection<int, GoogleDrive>
     */
    public function activeByPriority(): Collection
    {
        return $this->googleDriveRepository->getActiveByPriority();
    }
}
