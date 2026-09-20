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
     * Couvre les cas reels rencontres sur le terrain (Burundi) : PDF, Office
     * (doc/docx/ppt/pptx/xls/xlsx), OpenDocument (odt/ods/odp/odg), images
     * courantes, video mp4 (exposes filmes), archives zip/gzip et texte brut
     * (dont .md detecte en text/plain par finfo).
     *
     * @var list<string>
     */
    protected array $allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'application/vnd.oasis.opendocument.graphics',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
        'video/mp4',
        'application/zip',
        'application/x-zip-compressed',
        'application/gzip',
        'application/x-gzip',
        'text/plain',
        'text/markdown',
        'text/csv',
    ];

    /**
     * Extensions connues -> MIME de repli quand finfo echoue ou renvoie
     * application/octet-stream (cas reels : .odt renomme, .md, .gz...).
     *
     * @var array<string, string>
     */
    protected array $extensionMimeFallback = [
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'ppt' => 'application/vnd.ms-powerpoint',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'xls' => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'odt' => 'application/vnd.oasis.opendocument.text',
        'ods' => 'application/vnd.oasis.opendocument.spreadsheet',
        'odp' => 'application/vnd.oasis.opendocument.presentation',
        'odg' => 'application/vnd.oasis.opendocument.graphics',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'heic' => 'image/heic',
        'heif' => 'image/heif',
        'mp4' => 'video/mp4',
        'zip' => 'application/zip',
        'gz' => 'application/gzip',
        'tgz' => 'application/gzip',
        'md' => 'text/markdown',
        'txt' => 'text/plain',
        'csv' => 'text/csv',
    ];

    /**
     * Maximum upload size in bytes (200 MB).
     *
     * Releve de 50 Mo : les tuyaux reels atteignent 51,6 Mo (PDF scannes).
     * En streaming (hash_file + copy), 200 Mo restent raisonnables cote serveur.
     */
    protected int $maxFileSize = 209715200;

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
     *
     * Robuste aux cas reels : finfo via getMimeType() puis repli sur
     * l'extension (minuscule, sans espaces) quand le type est generique
     * ou absent. Normalise la casse et supprime les parametres (; charset).
     */
    public function detectMimeType(UploadedFile $file): string
    {
        $raw = $file->getMimeType() ?: 'application/octet-stream';
        $mime = strtolower(trim(explode(';', $raw)[0]));

        if ($mime === '' || $mime === 'application/octet-stream') {
            $ext = strtolower(pathinfo(trim($file->getClientOriginalName()), PATHINFO_EXTENSION));
            $ext = trim($ext);
            if ($ext !== '' && isset($this->extensionMimeFallback[$ext])) {
                return $this->extensionMimeFallback[$ext];
            }
        }

        return $mime === '' ? 'application/octet-stream' : $mime;
    }

    /**
     * Detect the MIME type of a plain local file (import disque).
     */
    public function detectMimeTypeForPath(string $absolutePath, ?string $originalName = null): string
    {
        $mime = 'application/octet-stream';

        if (is_readable($absolutePath)) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $detected = $finfo->file($absolutePath);
            if (is_string($detected) && $detected !== '') {
                $mime = strtolower(trim(explode(';', $detected)[0]));
            }
        }

        if ($mime === '' || $mime === 'application/octet-stream') {
            $ext = strtolower(pathinfo(trim((string) ($originalName ?? $absolutePath)), PATHINFO_EXTENSION));
            $ext = trim($ext);
            if ($ext !== '' && isset($this->extensionMimeFallback[$ext])) {
                return $this->extensionMimeFallback[$ext];
            }
        }

        return $mime === '' ? 'application/octet-stream' : $mime;
    }

    /**
     * Nom de fichier assaini : sans traversal, sans caracteres de controle,
     * espaces normalises, longueur bornee. Les accents sont conserves
     * (Drive et ext4 les supportent) mais le nom reste sur une seule ligne.
     */
    public function sanitizeFileName(string $name, int $maxLength = 200): string
    {
        $clean = str_replace(['\\', '/'], '-', $name);
        $clean = basename($clean);
        // Normalisation Unicode NFC si l'extension intl est disponible.
        if (class_exists(\Normalizer::class)) {
            $normalized = \Normalizer::normalize($clean, \Normalizer::FORM_C);
            if (is_string($normalized) && $normalized !== '') {
                $clean = $normalized;
            }
        }
        $clean = trim($clean);
        // Supprime les caracteres de controle (dont \r \n \t).
        $clean = (string) preg_replace('/[\x00-\x1F\x7F]/u', '', $clean);
        // Espaces multiples -> un seul.
        $clean = (string) preg_replace('/\s+/u', ' ', $clean);
        $clean = trim($clean, " .");
        if ($clean === '') {
            $clean = 'document-sans-nom';
        }
        if (mb_strlen($clean) > $maxLength) {
            $ext = pathinfo($clean, PATHINFO_EXTENSION);
            $base = pathinfo($clean, PATHINFO_FILENAME);
            $keep = $maxLength - ($ext !== '' ? mb_strlen($ext) + 1 : 0);
            $clean = mb_substr($base, 0, max(1, $keep)).($ext !== '' ? '.'.$ext : '');
        }

        return $clean;
    }

    /**
     * Taille maximale acceptee (octets). Expose pour les validations HTTP.
     */
    public function maxFileSize(): int
    {
        return $this->maxFileSize;
    }

    /**
     * Find an existing document with the same file hash.
     */
    public function findDuplicateByHash(string $fileHash): ?Document
    {
        return $this->documentRepository->findByFileHash($fileHash);
    }
}
