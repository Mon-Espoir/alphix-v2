<?php

namespace App\Http\Controllers;

use App\Http\Resources\DocumentResource;
use App\Services\DocumentRecognitionService;
use App\Services\SecondaryAIService;
use App\Services\UploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    public function __construct(
        protected UploadService $uploadService,
        protected DocumentRecognitionService $recognitionService,
        protected SecondaryAIService $secondaryAI
    ) {}

    public function validateFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:204800'], // Max 200 Mo (aligne sur UploadService)
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
            return response()->json(['message' => 'No duplicate document found'], 404);
        }

        return new DocumentResource($document);
    }

    /**
     * Reconnaissance intelligente depuis le nom de fichier : heuristiques
     * locales (base reelle) enrichies par l'IA si elle est active.
     */
    public function recognize(Request $request): JsonResponse
    {
        $data = $request->validate([
            'filename' => ['required', 'string', 'max:255'],
        ]);

        $recognition = $this->recognitionService->recognize($data['filename']);

        // Enrichissement IA (type + mots-cles) : non-bloquant, repli silencieux.
        $recognition['ai'] = $this->secondaryAI->analyze($data['filename']);

        if (empty($recognition['doc_type']) && ! empty($recognition['ai']['doc_type'])) {
            $recognition['doc_type'] = $recognition['ai']['doc_type'];
        }

        return response()->json(['data' => $recognition]);
    }
}
