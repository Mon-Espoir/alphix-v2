<?php

namespace App\Services;

use App\Models\Document;
use App\Repositories\DocumentRepository;
use App\Repositories\SearchRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Application service for document domain operations.
 */
class DocumentService
{
    /**
     * @param  DocumentRepository  $documentRepository  Document data access
     * @param  SearchRepository  $searchRepository  Search data access for document search
     */
    public function __construct(
        protected DocumentRepository $documentRepository,
        protected SearchRepository $searchRepository
    ) {
    }

    /**
     * Register a document upload.
     *
     * @param  array<string, mixed>  $data
     */
    public function upload(array $data): Model
    {
        $payload = array_merge([
            'uuid' => $data['uuid'] ?? (string) Str::uuid(),
            'status' => $data['status'] ?? 'pending',
            'ocr_status' => $data['ocr_status'] ?? 'pending',
            'visibility' => $data['visibility'] ?? 'public',
            'version' => $data['version'] ?? '1.0',
            'mime_type' => $data['mime_type'] ?? 'application/pdf',
            'file_size' => $data['file_size'] ?? 0,
            'downloads_count' => 0,
            'views_count' => 0,
            'is_featured' => false,
        ], $data);

        return $this->documentRepository->create($payload);
    }

    /**
     * Approve a document.
     *
     * @param  array<string, mixed>  $extra
     */
    public function approve(int $id, array $extra = []): Model
    {
        return $this->documentRepository->update($id, array_merge([
            'status' => 'approved',
            'published_at' => now(),
        ], $extra));
    }

    /**
     * Reject a document.
     *
     * @param  array<string, mixed>  $extra
     */
    public function reject(int $id, array $extra = []): Model
    {
        return $this->documentRepository->update($id, array_merge([
            'status' => 'rejected',
        ], $extra));
    }

    /**
     * Archive a document.
     *
     * @param  array<string, mixed>  $extra
     */
    public function archive(int $id, array $extra = []): Model
    {
        return $this->documentRepository->update($id, array_merge([
            'status' => 'archived',
        ], $extra));
    }

    /**
     * Retrieve featured documents.
     *
     * @return Collection<int, Document>
     */
    public function featured(): Collection
    {
        return $this->documentRepository->getFeatured();
    }

    /**
     * Retrieve recent documents.
     */
    public function recent(int $perPage = 15): LengthAwarePaginator
    {
        return $this->documentRepository->paginate($perPage);
    }

    /**
     * Increment the view counter of a document.
     */
    public function incrementView(int $id): Model
    {
        $document = $this->documentRepository->findOrFail($id);

        return $this->documentRepository->update($id, [
            'views_count' => ((int) $document->getAttribute('views_count')) + 1,
        ]);
    }

    /**
     * Increment the download counter of a document.
     */
    public function incrementDownload(int $id): Model
    {
        $document = $this->documentRepository->findOrFail($id);

        return $this->documentRepository->update($id, [
            'downloads_count' => ((int) $document->getAttribute('downloads_count')) + 1,
        ]);
    }

    /**
     * Search documents by free-text term.
     *
     * @return Collection<int, Document>
     */
    public function search(string $term): Collection
    {
        return $this->searchRepository->findDocumentsByTerm($term);
    }
}
