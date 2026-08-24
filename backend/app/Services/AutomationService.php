<?php

namespace App\Services;

use App\Models\Document;
use App\Models\GoogleDrive;
use App\Repositories\DocumentRepository;
use App\Repositories\GoogleDriveRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Application service coordinating automation pipeline operations.
 */
class AutomationService
{
    /**
     * @param  DocumentRepository  $documentRepository  Document data access
     * @param  GoogleDriveRepository  $googleDriveRepository  Google Drive data access
     */
    public function __construct(
        protected DocumentRepository $documentRepository,
        protected GoogleDriveRepository $googleDriveRepository
    ) {
    }

    /**
     * Mark a Google Drive account as synchronized.
     *
     * @param  array<string, mixed>  $extra
     */
    public function synchronizeDrive(int $driveId, array $extra = []): Model
    {
        return $this->googleDriveRepository->update($driveId, array_merge([
            'last_sync_at' => now(),
            'health_status' => $extra['health_status'] ?? 'healthy',
        ], $extra));
    }

    /**
     * Process pending documents by moving them to the processing status.
     *
     * @return array{processed: int, documents: Collection<int, Document>}
     */
    public function processPendingDocuments(): array
    {
        $pending = $this->documentRepository->getByStatus('pending');
        $processed = new Collection();

        foreach ($pending as $document) {
            $updated = $this->documentRepository->update((int) $document->getAttribute('id'), [
                'status' => 'processing',
            ]);

            $processed->push($updated);
        }

        return [
            'processed' => $processed->count(),
            'documents' => $processed,
        ];
    }

    /**
     * Resolve the preferred Google Drive target for automation.
     */
    public function resolveTargetDrive(): ?GoogleDrive
    {
        $default = $this->googleDriveRepository->getDefault();

        if ($default !== null) {
            return $default;
        }

        return $this->googleDriveRepository->getActiveByPriority()->first();
    }
}
