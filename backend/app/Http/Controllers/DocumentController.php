<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDocumentRequest;
use App\Http\Requests\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $documents = $this->documentService->recent();

        return DocumentResource::collection($documents);
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $document = $this->documentService->upload($request->validated());

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): DocumentResource
    {
        $document = $this->documentService->find($id);

        return new DocumentResource($document);
    }

    public function update(UpdateDocumentRequest $request, int $id): DocumentResource
    {
        $document = $this->documentService->update($id, $request->validated());

        return new DocumentResource($document);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->documentService->delete($id);

        return response()->json(null, 204);
    }

    public function featured(): AnonymousResourceCollection
    {
        $documents = $this->documentService->featured();

        return DocumentResource::collection($documents);
    }

    public function incrementView(int $id): JsonResponse
    {
        $this->documentService->incrementView($id);

        return response()->json(null, 204);
    }

    public function incrementDownload(int $id): JsonResponse
    {
        $this->documentService->incrementDownload($id);

        return response()->json(null, 204);
    }
}
