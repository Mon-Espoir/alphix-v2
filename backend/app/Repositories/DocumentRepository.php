<?php

namespace App\Repositories;

use App\Models\Document;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the documents table.
 */
class DocumentRepository extends BaseRepository
{
    /**
     * Create a new document repository instance.
     */
    public function __construct(Document $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a document by its public UUID.
     */
    public function findByUuid(string $uuid): ?Document
    {
        /** @var Document|null */
        return $this->query()->where('uuid', $uuid)->first();
    }

    /**
     * Find a document by its unique slug.
     */
    public function findBySlug(string $slug): ?Document
    {
        /** @var Document|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Find a document by its file hash.
     */
    public function findByFileHash(string $fileHash): ?Document
    {
        /** @var Document|null */
        return $this->query()->where('file_hash', $fileHash)->first();
    }

    /**
     * Retrieve documents for a given course.
     *
     * @return Collection<int, Document>
     */
    public function getByCourseId(int $courseId): Collection
    {
        return $this->query()
            ->where('course_id', $courseId)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve documents uploaded by a given user.
     *
     * @return Collection<int, Document>
     */
    public function getByUserId(int $userId): Collection
    {
        return $this->query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve documents filtered by status.
     *
     * @return Collection<int, Document>
     */
    public function getByStatus(string $status): Collection
    {
        return $this->query()
            ->where('status', $status)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve featured documents.
     *
     * @return Collection<int, Document>
     */
    public function getFeatured(): Collection
    {
        return $this->query()
            ->where('is_featured', true)
            ->orderByDesc('published_at')
            ->get();
    }

    /**
     * Retrieve APPROVED documents for a given course (public explorer).
     *
     * @return Collection<int, Document>
     */
    public function getApprovedByCourseId(int $courseId): Collection
    {
        return $this->query()
            ->where('course_id', $courseId)
            ->where('status', 'approved')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Paginate approved documents.
     */
    public function paginateApproved(int $perPage = 15): LengthAwarePaginator
    {
        return $this->query()
            ->where('status', 'approved')
            ->orderByDesc('published_at')
            ->paginate($perPage);
    }
}
