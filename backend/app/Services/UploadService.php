<?php

namespace App\Services;

use App\Models\Document;
use App\Repositories\DocumentRepository;
use Illuminate\Http\UploadedFile;

/**
 * Application service for upload file validation and fingerprinting.
 */
class UploadService
{
    /**
     * Allowed MIME types for academic document uploads.
     *
     * @var list<string>
     */
    protected array $allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
    ];

    /**
     * Maximum upload size in bytes (50 MB).
     */
    protected int $maxFileSize = 52428800;

    /**
     * @param  DocumentRepository  $documentRepository  Document data access
     */
    public function __construct(
        protected DocumentRepository $documentRepository
    ) {
    }

    /**
     * Validate an uploaded file against size and MIME constraints.
     *
     * @return array{valid: bool, errors: list<string>}
     */
    public function validateFile(UploadedFile $file): array
    {
        $errors = [];

        if (! $file->isValid()) {
            $errors[] = 'The uploaded file is invalid.';
        }

        if ($file->getSize() > $this->maxFileSize) {
            $errors[] = 'The uploaded file exceeds the maximum allowed size.';
        }

        $mimeType = $this->detectMimeType($file);

        if (! in_array($mimeType, $this->allowedMimeTypes, true)) {
            $errors[] = 'The uploaded file MIME type is not allowed.';
        }

        return [
            'valid' => $errors === [],
            'errors' => $errors,
        ];
    }

    /**
     * Compute the SHA-256 hash of an uploaded file.
     */
    public function computeHash(UploadedFile $file): string
    {
        $path = $file->getRealPath();

        if ($path === false) {
            return hash('sha256', $file->getContent());
        }

        return hash_file('sha256', $path) ?: hash('sha256', $file->getContent());
    }

    /**
     * Detect the MIME type of an uploaded file.
     */
    public function detectMimeType(UploadedFile $file): string
    {
        return $file->getMimeType() ?: 'application/octet-stream';
    }

    /**
     * Find an existing document with the same file hash.
     */
    public function findDuplicateByHash(string $fileHash): ?Document
    {
        return $this->documentRepository->findByFileHash($fileHash);
    }
}
