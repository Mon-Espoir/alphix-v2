<?php

namespace App\Services;

use App\Repositories\DocumentRepository;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service for document popularity and statistics.
 */
class StatisticsService
{
    /**
     * @param  DocumentRepository  $documentRepository  Document data access
     */
    public function __construct(
        protected DocumentRepository $documentRepository
    ) {
    }

    /**
     * Compute and persist popularity metadata for a document.
     *
     * Score formula: views + (downloads * 2).
     * Stored in the document metadata JSON field via the repository.
     */
    public function updatePopularity(int $documentId): Model
    {
        $document = $this->documentRepository->findOrFail($documentId);

        $views = (int) $document->getAttribute('views_count');
        $downloads = (int) $document->getAttribute('downloads_count');
        $score = round(($views * 1.0) + ($downloads * 2.0), 2);

        $metadata = $document->getAttribute('metadata');
        if (! is_array($metadata)) {
            $metadata = [];
        }

        $metadata['popularity_score'] = $score;
        $metadata['popularity_updated_at'] = now()->toIso8601String();

        return $this->documentRepository->update($documentId, [
            'metadata' => $metadata,
        ]);
    }

    /**
     * Recalculate popularity for all documents and return status counts.
     *
     * @return array{
     *     processed: int,
     *     pending: int,
     *     processing: int,
     *     approved: int,
     *     rejected: int,
     *     archived: int,
     *     featured: int
     * }
     */
    public function recalculateStatistics(): array
    {
        $documents = $this->documentRepository->all();

        foreach ($documents as $document) {
            $this->updatePopularity((int) $document->getAttribute('id'));
        }

        return [
            'processed' => $documents->count(),
            'pending' => $this->documentRepository->getByStatus('pending')->count(),
            'processing' => $this->documentRepository->getByStatus('processing')->count(),
            'approved' => $this->documentRepository->getByStatus('approved')->count(),
            'rejected' => $this->documentRepository->getByStatus('rejected')->count(),
            'archived' => $this->documentRepository->getByStatus('archived')->count(),
            'featured' => $this->documentRepository->getFeatured()->count(),
        ];
    }
}
