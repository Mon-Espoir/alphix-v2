<?php

namespace App\Http\Controllers;

use App\Http\Resources\DocumentResource;
use App\Services\DocumentFavoriteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DocumentFavoriteController extends Controller
{
    public function __construct(
        protected DocumentFavoriteService $favoriteService
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $favorites = $this->favoriteService->forUser($request->user()->id);

        return DocumentResource::collection($favorites);
    }

    public function store(Request $request, int $documentId): JsonResponse
    {
        $this->favoriteService->add($request->user()->id, $documentId);

        return response()->json(['message' => 'Ajouté aux favoris.'], 201);
    }

    public function destroy(Request $request, int $documentId): JsonResponse
    {
        $this->favoriteService->remove($request->user()->id, $documentId);

        return response()->json(null, 204);
    }

    public function check(Request $request, int $documentId): JsonResponse
    {
        $isFav = $this->favoriteService->isFavorite($request->user()->id, $documentId);

        return response()->json(['is_favorite' => $isFav]);
    }
}
