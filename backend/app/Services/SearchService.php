<?php

namespace App\Services;

use App\Models\Document;
use App\Models\SearchQuery;
use App\Repositories\SearchRepository;

/**
 * Application service for search domain operations.
 */
class SearchService
{
    /**
     * @param  SearchRepository  $searchRepository  Search data access
     */
    public function __construct(
        protected SearchRepository $searchRepository
    ) {
    }

    /**
     * Search documents by free-text term.
     *
     * @return Collection<int, Document>
     */
    public function searchDocuments(string $term): Collection
    {
        return $this->searchRepository->findDocumentsByTerm($term);
    }

    /**
     * Persist a search query log entry.
     *
     * @param  array<string, mixed>  $data
     */
    public function logQuery(array $data): SearchQuery
    {
        return $this->searchRepository->logQuery($data);
    }

    /**
     * Build a ranked list of popular search queries.
     *
     * @return list<array{query: string, count: int, average_results: float}>
     */
    public function popularQueries(int $limit = 10): array
    {
        return $this->searchRepository->popularQueries($limit);
    }
}
