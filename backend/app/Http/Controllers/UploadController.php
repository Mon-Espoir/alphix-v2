<?php

namespace App\Http\Controllers;

use App\Http\Resources\DocumentResource;
use App\Services\UploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    public function __construct(
        protected UploadService $uploadService
    ) {
    }

    public function validateFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:20480'], // Max 20MB
        ]);

        $file = $request->file('file');

        $result = $this->uploadService->validateFile($file);

        return response()->json($result);
    }

    public function computeHash(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file'],
        ]);

        $file = $request->file('file');

        $hash = $this->uploadService->computeHash($file);

        return response()->json(['hash' => $hash]);
    }

    public function detectMimeType(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file'],
        ]);

        $file = $request->file('file');

        $mimeType = $this->uploadService->detectMimeType($file);

        return response()->json(['mime_type' => $mimeType]);
    }

    public function findDuplicateByHash(string $hash): DocumentResource|JsonResponse
    {
        $document = $this->uploadService->findDuplicateByHash($hash);

        if (! $document) {
            return response()->json(["message" => "No duplicate document found"], 404);
        }

        return new DocumentResource($document);
    }
}
