<?php

namespace App\Services;

use App\Models\DocumentTag;
use App\Repositories\DocumentTagRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for document tag domain operations.
 */
class DocumentTagService
{
    /**
     * @param  DocumentTagRepository  $documentTagRepository  Document tag data access
     */
    public function __construct(
        protected DocumentTagRepository $documentTagRepository
    ) {
    }

    /**
     * Create a document tag.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model
    {
        return $this->documentTagRepository->create($data);
    }

    /**
     * Update a document tag.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->documentTagRepository->update($id, $data);
    }

    /**
     * Delete a document tag.
     */
    public function delete(int $id): bool
    {
        return $this->documentTagRepository->delete($id);
    }

    /**
     * Find a document tag by identifier.
     */
    public function find(int $id): ?Model
    {
        return $this->documentTagRepository->find($id);
    }

    /**
     * Find a document tag by slug.
     */
    public function findBySlug(string $slug): ?DocumentTag
    {
        return $this->documentTagRepository->findBySlug($slug);
    }

    /**
     * Retrieve all document tags ordered by name.
     *
     * @return Collection<int, DocumentTag>
     */
    public function all(): Collection
    {
        return $this->documentTagRepository->getOrderedByName();
    }

    /**
     * Retrieve tags assigned to a document.
     *
     * @return Collection<int, DocumentTag>
     */
    public function byDocument(int $documentId): Collection
    {
        return $this->documentTagRepository->getByDocumentId($documentId);
    }
}
