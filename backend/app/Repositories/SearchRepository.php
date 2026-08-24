<?php

namespace App\Repositories;

use App\Models\Document;
use App\Models\DocumentSearchIndex;
use App\Models\SearchQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for search queries and document search index lookups.
 */
class SearchRepository extends BaseRepository
{
    /**
     * Create a new search repository instance.
     */
    public function __construct(
        SearchQuery $model,
        protected Document $document,
        protected DocumentSearchIndex $documentSearchIndex
    ) {
        parent::__construct($model);
    }

    /**
     * Persist a search query log entry.
     *
     * @param  array<string, mixed>  $data
     */
    public function logQuery(array $data): SearchQuery
    {
        /** @var SearchQuery */
        return $this->create($data);
    }

    /**
     * Retrieve search queries for a given user.
     *
     * @return Collection<int, SearchQuery>
     */
    public function getByUserId(int $userId): Collection
    {
        return $this->query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve recent search query logs.
     *
     * @return Collection<int, SearchQuery>
     */
    public function getRecent(int $limit = 50): Collection
    {
        return $this->query()
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Find documents whose title or description match a term.
     *
     * @return Collection<int, Document>
     */
    public function findDocumentsByTerm(string $term): Collection
    {
        $like = '%' . $term . '%';

        return $this->document->newQuery()
            ->where(function ($query) use ($like): void {
                $query->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('original_name', 'like', $like);
            })
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Paginate documents matching a term in title or description.
     */
    public function paginateDocumentsByTerm(string $term, int $perPage = 15): LengthAwarePaginator
    {
        $like = '%' . $term . '%';

        return $this->document->newQuery()
            ->where(function ($query) use ($like): void {
                $query->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('original_name', 'like', $like);
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Find documents whose indexed extracted text contains a term.
     *
     * @return Collection<int, Document>
     */
    public function findDocumentsByIndexedText(string $term): Collection
    {
        $like = '%' . $term . '%';

        return $this->document->newQuery()
            ->whereHas('searchIndex', function ($query) use ($like): void {
                $query->where('extracted_text', 'like', $like)
                    ->where('status', 'completed');
            })
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve a search index row by document id.
     */
    public function findSearchIndexByDocumentId(int $documentId): ?DocumentSearchIndex
    {
        /** @var DocumentSearchIndex|null */
        return $this->documentSearchIndex->newQuery()
            ->where('document_id', $documentId)
            ->first();
    }
}
