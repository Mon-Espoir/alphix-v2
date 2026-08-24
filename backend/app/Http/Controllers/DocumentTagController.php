<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDocumentTagRequest;
use App\Http\Requests\UpdateDocumentTagRequest;
use App\Http\Resources\DocumentTagResource;
use App\Services\DocumentTagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DocumentTagController extends Controller
{
    public function __construct(
        protected DocumentTagService $documentTagService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $documentTags = $this->documentTagService->all();

        return DocumentTagResource::collection($documentTags);
    }

    public function store(StoreDocumentTagRequest $request): JsonResponse
    {
        $documentTag = $this->documentTagService->create($request->validated());

        return (new DocumentTagResource($documentTag))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): DocumentTagResource
    {
        $documentTag = $this->documentTagService->find($id);

        return new DocumentTagResource($documentTag);
    }

    public function update(UpdateDocumentTagRequest $request, int $id): DocumentTagResource
    {
        $documentTag = $this->documentTagService->update($id, $request->validated());

        return new DocumentTagResource($documentTag);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->documentTagService->delete($id);

        return response()->json(null, 204);
    }

    public function bySlug(string $slug): DocumentTagResource
    {
        $documentTag = $this->documentTagService->findBySlug($slug);

        return new DocumentTagResource($documentTag);
    }

    public function byDocument(int $documentId): AnonymousResourceCollection
    {
        $documentTags = $this->documentTagService->byDocument($documentId);

        return DocumentTagResource::collection($documentTags);
    }
}
