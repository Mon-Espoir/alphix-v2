<?php

namespace App\Repositories;

use App\Models\DocumentTag;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the document_tags table.
 */
class DocumentTagRepository extends BaseRepository
{
    /**
     * Create a new document tag repository instance.
     */
    public function __construct(DocumentTag $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a document tag by its unique name.
     */
    public function findByName(string $name): ?DocumentTag
    {
        /** @var DocumentTag|null */
        return $this->query()->where('name', $name)->first();
    }

    /**
     * Find a document tag by its unique slug.
     */
    public function findBySlug(string $slug): ?DocumentTag
    {
        /** @var DocumentTag|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Retrieve all tags ordered by name.
     *
     * @return Collection<int, DocumentTag>
     */
    public function getOrderedByName(): Collection
    {
        return $this->query()
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve tags associated with a given document.
     *
     * @return Collection<int, DocumentTag>
     */
    public function getByDocumentId(int $documentId): Collection
    {
        return $this->query()
            ->whereHas('documents', function ($query) use ($documentId): void {
                $query->where('documents.id', $documentId);
            })
            ->orderBy('name')
            ->get();
    }
}
