<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\SearchQueryResource;
use App\Services\DocumentService;
use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SearchController extends Controller
{
    public function __construct(
        protected DocumentService $documentService,
        protected SearchService $searchService
    ) {
    }

    public function search(SearchDocumentRequest $request): AnonymousResourceCollection
    {
        $searchTerm = $request->validated(
            key: 'query',
            default: '',
        );

        $results = $this->documentService->search($searchTerm);

        $this->searchService->logQuery([
            'query' => $searchTerm,
            'results_count' => $results->count(),
            'user_id' => $request->user()?->id,
        ]);

        return DocumentResource::collection($results);
    }

    public function popularQueries(): AnonymousResourceCollection
    {
        $popularQueries = $this->searchService->popularQueries();

        return SearchQueryResource::collection($popularQueries);
    }
}
