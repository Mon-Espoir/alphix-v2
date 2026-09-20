<?php

namespace App\Http\Controllers;

use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Models\DocumentDownload;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Historique des telechargements de l'utilisateur connecte
 * ---------------------------------------------------------------------------
 * Lecture seule sur la table existante `document_downloads` (aucune
 * migration). Les evenements sont enregistres par
 * DocumentController::incrementDownload a chaque telechargement.
 */
class DownloadsController extends Controller
{
    /**
     * Documents telecharges par l'utilisateur, plus recents d'abord.
     * Doublons regroupes (un document apparait une seule fois).
     */
    public function mine(Request $request): AnonymousResourceCollection
    {
        $userId = $request->user()->id;

        $orderedIds = DocumentDownload::query()
            ->where('user_id', $userId)
            ->orderByDesc('downloaded_at')
            ->pluck('document_id')
            ->unique()
            ->values();

        if ($orderedIds->isEmpty()) {
            return DocumentResource::collection(collect([]));
        }

        $documents = Document::query()
            ->whereIn('id', $orderedIds)
            ->with(['course.department.faculty', 'course.level', 'course.semester', 'tags'])
            ->get()
            ->keyBy('id');

        $ordered = $orderedIds
            ->map(fn ($id) => $documents->get($id))
            ->filter();

        return DocumentResource::collection($ordered->values());
    }
}
