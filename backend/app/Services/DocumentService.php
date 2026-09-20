<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use App\Repositories\DocumentRepository;
use App\Repositories\SearchRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
    ) {}

    /**
     * Register a document upload.
     *
     * Flux réel : fichier reçu -> hash serveur -> reconnaissance (base) ->
     * transfert Rclone vers Google Drive -> enregistrement des vraies
     * métadonnées Drive. Aucun lien ni ID fabriqué.
     *
     * @param  array<string, mixed>  $data
     */
    public function upload(array $data, ?UploadedFile $file = null): Model
    {
        if ($file !== null && $file->isValid()) {
            // Le fichier binaire reçu fait foi pour les métadonnées physiques.
            $data['original_name'] = $file->getClientOriginalName() ?: ($data['original_name'] ?? 'fichier');
            $data['mime_type'] = $file->getMimeType() ?: 'application/octet-stream';
            $data['file_size'] = $file->getSize();
            $data['file_hash'] = app(UploadService::class)->computeHash($file);

            // Stockage temporaire (jamais définitif) jusqu'au transfert Drive.
            $localPath = $file->store('documents', 'local');
            $absolutePath = Storage::disk('local')->path($localPath);

            // --- Reconnaissance intelligente depuis le nom de fichier ------
            $recognition = app(DocumentRecognitionService::class)->recognize($data['original_name']);

            // Enrichissement IA (type + mots-cles) : non-bloquant, repli silencieux.
            $analysis = app(SecondaryAIService::class)->analyze($data['original_name']);
            if (empty($recognition['doc_type']) && ! empty($analysis['doc_type'])) {
                $recognition['doc_type'] = $analysis['doc_type'];
            }

            if (empty($data['doc_type'])) {
                $data['doc_type'] = $recognition['doc_type'] ?? null;
            }

            if (empty($data['course_id']) && ! empty($recognition['course_id'])) {
                // Un seul cours correspond : association automatique.
                $data['course_id'] = $recognition['course_id'];
            }

            $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];
            foreach ([
                "recognized_year:{$recognition['academic_year']}",
                "recognized_level:{$recognition['level_code']}",
                "recognized_semester:{$recognition['semester_code']}",
            ] as $entry) {
                if (! str_ends_with($entry, ':') && ! str_contains($entry, '::')) {
                    $metadata[] = $entry;
                }
            }
            if (($faculty = $recognition['faculty']) !== null) {
                $metadata[] = "recognized_faculty:{$faculty['code']}";
            }
            if (($department = $recognition['department']) !== null) {
                $metadata[] = "recognized_department:{$department['code']}";
            }
            if ($recognition['reason'] !== null) {
                $metadata[] = 'recognition:'.str_replace(' ', '_', $recognition['reason']);
            }
            foreach ($recognition['suggestions'] as $suggestion) {
                $metadata[] = "suggested_course:{$suggestion['course_id']}|{$suggestion['code']}";
            }

            // --- Transfert vers Google Drive via Rclone (avec fallback local) ---
            $rcloneSuccess = false;
            try {
                $rclone = app(RcloneService::class)->upload($absolutePath, $data['original_name']);
                $data['drive_file_id'] = $rclone['id'];
                $data['drive_web_view_link'] = $rclone['web_view_link'];
                $data['drive_download_link'] = $rclone['download_link'];

                $metadata[] = 'transfer:rclone';
                $metadata[] = "remote:{$rclone['remote_path']}";
                $metadata[] = "drive_file_id:{$rclone['id']}";
                $rcloneSuccess = true;
            } catch (\Throwable $e) {
                // Fallback propre : rclone indisponible en dev/test ou Drive non configuré.
                // On conserve le fichier en local pour téléchargement direct.
                report($e);
                $metadata[] = 'transfer:local-fallback';
                $metadata[] = 'rclone_error:'.str_replace(' ', '_', substr($e->getMessage(), 0, 80));
                // Conserve le fichier local comme fallback : déplace vers storage/documents
                // avec un nom assaini (accents conserves, controles supprimes).
                $safeOriginal = app(UploadService::class)->sanitizeFileName($data['original_name']);
                $fallbackPath = 'documents/'.($data['uuid'] ?? Str::uuid()).'_'.$safeOriginal;
                Storage::disk('local')->move($localPath, $fallbackPath);
                $data['drive_file_id'] = null;
                // Fallback PUBLIC : le fichier doit être servi via /storage (symlink) ET via l'API /documents/{id}/file.
                // On le copie vers le disque public (racine réelle serveur pour /storage) et on garde aussi l'original en local (backup).
                try {
                    Storage::disk('public')->put($fallbackPath, Storage::disk('local')->get($fallbackPath));
                } catch (\Throwable $copyError) {
                    report($copyError);
                }
                $publicUrl = Storage::disk('public')->url($fallbackPath);
                $data['drive_web_view_link'] = $publicUrl;
                $data['drive_download_link'] = $publicUrl;
                $data['metadata'][] = "local_path:{$fallbackPath}";
                $rcloneSuccess = false;
            }
            $data['metadata'] = $metadata;

            if ($rcloneSuccess) {
                // Nettoyage du temporaire (local) — succès rclone, on supprime le temporaire
                Storage::disk('local')->delete($localPath);
            }
            // En cas de fallback, le fichier reste en local à $fallbackPath et sera servi via file_url
        }

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

        // `doc_type` est une colonne obligatoire sans default DB : repli 'other'.
        $payload['doc_type'] = ! empty($payload['doc_type']) ? $payload['doc_type'] : 'other';

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
     * Find a document by identifier.
     */
    public function find(int $id): Model
    {
        return $this->documentRepository->findOrFail($id);
    }

    /**
     * Update a document.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Model
    {
        return $this->documentRepository->update($id, $data);
    }

    /**
     * Delete a document.
     */
    public function delete(int $id): bool
    {
        return $this->documentRepository->delete($id);
    }

    /**
     * Retrieve recent APPROVED documents (public explorer).
     * Les documents pending/rejected/archived ne sont jamais exposés ici :
     * c'est ce total qui alimente l'accueil et le profil.
     */
    public function recent(int $perPage = 15): LengthAwarePaginator
    {
        return $this->documentRepository->paginateApproved($perPage);
    }

    /**
     * Retrieve all documents of a given course (public explorer).
     */
    public function getByCourse(int $courseId): Collection
    {
        return $this->documentRepository->getByCourseId($courseId);
    }

    /**
     * Retrieve APPROVED documents of a given course (public explorer).
     * Utilisé par GET /documents?course_id= : exclut pending/rejected/archived.
     *
     * @return Collection<int, Document>
     */
    public function getApprovedByCourse(int $courseId): Collection
    {
        return $this->documentRepository->getApprovedByCourseId($courseId);
    }

    /**
     * Classification manuelle d'un document en attente (fallback upload).
     * Réservé aux documents pending/processing : rattache le cours et le type
     * choisis par l'étudiant quand l'identification auto/IA a échoué.
     * Seuls course_id + doc_type sont modifiables ici (aucun privilège :
     * ni status, ni visibilité, ni featured).
     *
     * @param  array{course_id: int, doc_type: string}  $data
     */
    public function classify(int $id, User $user, array $data): Model
    {
        $document = $this->documentRepository->findOrFail($id);

        if (! in_array($document->getAttribute('status'), ['pending', 'processing'], true)) {
            throw ValidationException::withMessages([
                'document' => ['Seul un document en attente peut être reclassifié.'],
            ]);
        }

        $metadata = $document->getAttribute('metadata');
        if (! is_array($metadata)) {
            $metadata = [];
        }
        $metadata[] = 'classified_manually:1';
        $metadata[] = 'classified_by:'.$user->id;

        return $this->documentRepository->update($id, [
            'course_id' => (int) $data['course_id'],
            'doc_type' => (string) $data['doc_type'],
            'metadata' => $metadata,
        ]);
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
     * Search documents by term and facet filters.
     *
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Document>
     */
    public function search(array $filters): LengthAwarePaginator
    {
        return $this->searchRepository->searchDocuments($filters);
    }
}
