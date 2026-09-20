<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Services\DocumentService;
use App\Services\SearchService;
use App\Services\SecondaryAIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SearchController extends Controller
{
    public function __construct(
        protected DocumentService $documentService,
        protected SearchService $searchService,
        protected SecondaryAIService $secondaryAI
    ) {}

    public function search(SearchDocumentRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $searchTerm = trim((string) ($filters['query'] ?? ''));

        // 1. SQL d'abord (rapide, paginé)
        $results = $this->documentService->search($filters);

        // 1b. Fallback tolérant (accents, fautes, acronymes) si SQL = 0
        $usedFallback = false;
        if ($searchTerm !== '' && $results->total() === 0) {
            try {
                $fallback = app(\App\Repositories\SearchRepository::class)->searchDocumentsFuzzy($filters);
                if ($fallback->total() > 0) {
                    $results = $fallback;
                    $usedFallback = true;
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        // 1c. Fallback IA Gemini (si configurée) quand toujours 0 résultat : propose les meilleurs via suggestions + garde le fallback fuzzy
        $aiSuggestions = [];
        $aiFallback = [];
        if ($searchTerm !== '' && $results->total() === 0) {
            try {
                $aiSuggestions = $this->secondaryAI->suggest($searchTerm, [
                    'total_results' => 0,
                    'doc_type' => $filters['doc_type'] ?? null,
                ]);
                // Si l'IA propose des alias, on rejoue la recherche avec le premier alias
                if ($aiSuggestions !== [] && isset($aiSuggestions[0]['label'])) {
                    $alias = trim((string) $aiSuggestions[0]['label']);
                    if ($alias !== '' && mb_strtolower($alias) !== mb_strtolower($searchTerm)) {
                        $aliasFilters = array_merge($filters, ['query' => $alias]);
                        $aliasResults = app(\App\Repositories\SearchRepository::class)->searchDocumentsFuzzy($aliasFilters);
                        if ($aliasResults->total() > 0) {
                            $aiFallback = $aliasResults->items();
                        }
                    }
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $this->searchService->logQuery([
            'query' => $searchTerm,
            'results_count' => $results->total(),
            'user_id' => $request->user()?->id,
        ]);

        $collection = DocumentResource::collection($results);

        $additional = [];
        if ($usedFallback) $additional['fallback'] = 'fuzzy';
        if ($searchTerm !== '') {
            $suggestions = $aiSuggestions !== [] ? $aiSuggestions : $this->secondaryAI->suggest($searchTerm, [
                'total_results' => $results->total(),
                'doc_type' => $filters['doc_type'] ?? null,
            ]);
            if ($suggestions !== []) $additional['ai_suggestions'] = $suggestions;
            if ($aiFallback !== []) $additional['ai_fallback'] = $aiFallback;
        }
        if ($additional !== []) $collection->additional($additional);

        return $collection;
    }

    public function popularQueries(): JsonResponse
    {
        // popularQueries() renvoie des tableaux {query, count, average_results},
        // pas des modèles — on sérialise directement au contrat consommé par le frontend.
        $popular = collect($this->searchService->popularQueries(10))
            ->map(static fn (array $entry): array => [
                'query' => $entry['query'],
                'results_count' => (int) $entry['count'],
            ])
            ->values()
            ->all();

        return response()->json(['data' => $popular]);
    }
}
