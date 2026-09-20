<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentFavorite;
use Illuminate\Database\Eloquent\Collection;

class DocumentFavoriteService
{
    public function forUser(int $userId): Collection
    {
        return Document::whereHas('favoritedByUsers', fn ($q) => $q->where('users.id', $userId))
            ->with(['course.department.faculty', 'course.level', 'course.semester', 'tags'])
            ->withCount(['favoritedByUsers'])
            ->latest()
            ->get();
    }

    public function add(int $userId, int $documentId): void
    {
        DocumentFavorite::firstOrCreate([
            'user_id' => $userId,
            'document_id' => $documentId,
        ]);
    }

    public function remove(int $userId, int $documentId): void
    {
        DocumentFavorite::where('user_id', $userId)->where('document_id', $documentId)->delete();
    }

    public function isFavorite(int $userId, int $documentId): bool
    {
        return DocumentFavorite::where('user_id', $userId)->where('document_id', $documentId)->exists();
    }
}
