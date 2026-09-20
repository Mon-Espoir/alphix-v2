<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDocumentRequest;
use App\Http\Requests\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $courseId = $request->query('course_id');

        if ($courseId !== null && ctype_digit((string) $courseId)) {
            // Filtre par cours : seuls les documents approuvés (cohérent avec l'accueil/profil).
            $documents = $this->documentService->getApprovedByCourse((int) $courseId);

            return DocumentResource::collection($documents);
        }

        // Respecte per_page (1..100) : HomePage/Dashboard demandent per_page=1 pour le total.
        $perPage = max(1, min(100, (int) $request->query('per_page', 15)));
        $documents = $this->documentService->recent($perPage);

        return DocumentResource::collection($documents);
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        Gate::authorize('createForCourse', [\App\Models\Document::class, isset($validated['course_id']) ? (int) $validated['course_id'] : null]);

        $document = $this->documentService->upload(
            $validated,
            $request->file('file')
        );

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, int $id): DocumentResource
    {
        $document = $this->documentService->find($id);
        // Confidentialité : un document non approuvé n'est visible que par le
        // staff (admin) ou son auteur (modération). Les invités reçoivent 404.
        if ($document->status !== 'approved' && ! $this->canPreviewUnapproved($request, $document)) {
            abort(404);
        }
        $document->loadMissing(['course.department.faculty', 'course.level', 'course.semester', 'tags', 'user']);

        return new DocumentResource($document);
    }

    /**
     * Staff admin ou auteur du document (résolution best-effort du token Sanctum
     * sur ces routes publiques, comme incrementDownload).
     */
    private function canPreviewUnapproved(Request $request, \App\Models\Document $document): bool
    {
        try {
            $user = $request->user() ?? auth('sanctum')->user();
        } catch (\Throwable) {
            return false;
        }
        if ($user === null) {
            return false;
        }
        if (in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true)) {
            return true;
        }

        return (int) $user->id === (int) $document->user_id;
    }

    public function update(UpdateDocumentRequest $request, int $id): DocumentResource
    {
        Gate::authorize('update', $this->documentService->find($id));

        $document = $this->documentService->update($id, $request->validated());

        return new DocumentResource($document);
    }

    /**
     * Classification manuelle d'un document en attente (fallback upload).
     * L'étudiant rattache lui-même son dépôt au bon cours + type quand
     * l'identification automatique/IA a échoué. Autorisé :
     *   - au propriétaire du document (tout rôle) tant qu'il est pending/processing ;
     *   - au staff via la policy `update` (admin partout, délégué dans son périmètre).
     * Seuls course_id + doc_type sont persistés (aucun changement de statut).
     */
    public function classify(Request $request, int $id): DocumentResource
    {
        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'doc_type' => ['required', 'string', Rule::in([
                'syllabus', 'exam', 'tp', 'td', 'report', 'presentation', 'thesis',
            ])],
        ], [
            'course_id.required' => 'Veuillez sélectionner votre cours dans la liste.',
            'course_id.exists' => 'Le cours sélectionné est invalide.',
            'doc_type.required' => 'Veuillez sélectionner le type de document.',
            'doc_type.in' => 'Le type de document sélectionné est invalide.',
        ]);

        $document = $this->documentService->find($id);
        $user = $request->user();

        $isOwner = $user !== null && (int) $user->id === (int) $document->user_id;
        $isStaff = $user !== null && Gate::allows('update', $document);

        if (! $isOwner && ! $isStaff) {
            abort(403, 'Seul le propriétaire du document (ou un modérateur) peut le classifier.');
        }

        $document = $this->documentService->classify($id, $user, $validated);
        $document->loadMissing(['course.department.faculty', 'course.level', 'course.semester', 'tags', 'user']);

        return new DocumentResource($document);
    }

    public function destroy(int $id): JsonResponse
    {
        Gate::authorize('delete', $this->documentService->find($id));

        $this->documentService->delete($id);

        return response()->json(null, 204);
    }

    public function featured(): AnonymousResourceCollection
    {
        $documents = $this->documentService->featured();

        return DocumentResource::collection($documents);
    }

    public function incrementView(int $id): JsonResponse
    {
        $this->documentService->incrementView($id);

        return response()->json(null, 204);
    }

    public function incrementDownload(Request $request, int $id): JsonResponse
    {
        $this->documentService->incrementDownload($id);

        // Historique par utilisateur (table existante, jamais bloquant).
        // Route publique : resout le token Sanctum meme sans middleware auth.
        try {
            $userId = $request->user()?->id;
            if ($userId === null) {
                try {
                    $userId = auth('sanctum')->user()?->id;
                } catch (\Throwable) {
                    $userId = null;
                }
            }
            \App\Models\DocumentDownload::create([
                'document_id' => $id,
                'user_id' => $userId,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 2000),
                'downloaded_at' => now(),
            ]);
        } catch (\Throwable) {
            // Le compteur reste la source de verite : l'historique ne bloque jamais.
        }

        return response()->json(null, 204);
    }

    /**
     * Sert le fichier physique (aperçu inline ou téléchargement).
     * Public : vérifie que le document est approuvé. Supporte :
     *  - fichiers Drive (drive_file_id) -> redirection vers drive_download_link
     *  - fichiers locaux (public ET private) -> streaming avec bon MIME
     *  - fallback 404 explicite si fichier absent
     */
    public function file(Request $request, int $id): BinaryFileResponse|StreamedResponse|\Illuminate\Http\RedirectResponse|JsonResponse
    {
        $document = $this->documentService->find($id);

        // Confidentialité : seuls les approuvés sont servis publiquement.
        // Les pending/rejected (modération, ex. noms non anonymisés) exigent
        // le staff admin ou l'auteur, sinon 404 (aucune fuite d'existence).
        if ($document->status !== 'approved' && ! $this->canPreviewUnapproved($request, $document)) {
            return response()->json(['message' => 'Document non disponible.'], 404);
        }

        $disposition = $request->query('download') === '1' ? 'attachment' : 'inline';

        // 1) Tenter de résoudre le chemin local depuis les métadonnées.
        $localPath = null;
        $meta = $document->metadata;
        if (is_array($meta)) {
            foreach ($meta as $entry) {
                if (is_string($entry) && str_starts_with($entry, 'local_path:')) {
                    $localPath = substr($entry, strlen('local_path:'));
                    break;
                }
            }
            // Cas où metadata est associative (ancien upload_engine)
            if ($localPath === null && isset($meta['local_path']) && is_string($meta['local_path'])) {
                $localPath = $meta['local_path'];
            }
        }
        // 2) Fallback : extraire le nom de fichier depuis drive_download_link si c'est un /storage
        if ($localPath === null) {
            $candidate = $document->drive_download_link ?? $document->drive_web_view_link ?? '';
            if (is_string($candidate) && str_contains($candidate, '/storage/documents/')) {
                $fileName = basename(parse_url($candidate, PHP_URL_PATH) ?: $candidate);
                // Nettoie les %20 et autres encodages
                $fileName = urldecode($fileName);
                $localPath = 'documents/'.$fileName;
            }
        }

        // 3) Cherche le fichier sur les deux disques (public d'abord, puis private pour compatibilité)
        $foundDisk = null;
        $foundPath = null;
        if ($localPath !== null) {
            if (Storage::disk('public')->exists($localPath)) {
                $foundDisk = 'public';
                $foundPath = Storage::disk('public')->path($localPath);
            } elseif (Storage::disk('local')->exists($localPath)) {
                // Copie à la volée vers public pour les prochaines requêtes (robustesse)
                try {
                    Storage::disk('public')->put($localPath, Storage::disk('local')->get($localPath));
                    $foundDisk = 'public';
                    $foundPath = Storage::disk('public')->path($localPath);
                } catch (\Throwable) {
                    $foundDisk = 'local';
                    $foundPath = Storage::disk('local')->path($localPath);
                }
            }
        }

        if ($foundPath !== null && is_file($foundPath) && is_readable($foundPath)) {
            $mime = $document->mime_type ?: (mime_content_type($foundPath) ?: 'application/octet-stream');
            // HEIC non reconnu par mime_content_type -> forcer
            if (str_ends_with(strtolower($foundPath), '.heic')) {
                $mime = 'image/heic';
            } elseif (str_ends_with(strtolower($foundPath), '.heif')) {
                $mime = 'image/heif';
            }
            $headers = [
                'Content-Type' => $mime,
                'X-Content-Type-Options' => 'nosniff',
            ];

            // Pour l'aperçu, on laisse le navigateur décider (inline). Pour le téléchargement, on force.
            return response()->file($foundPath, $headers);
        }

        // 4) Aucun fichier local : si Drive ID présent, redirection
        if (! empty($document->drive_download_link) && filter_var($document->drive_download_link, FILTER_VALIDATE_URL)) {
            // Si le lien stockage est cassé mais le Drive est valide, on redirige vers Drive.
            // Pour /storage cassé sans fichier, on tente quand même la redirection Drive si c'est une vraie URL Drive.
            if (str_contains($document->drive_download_link, 'drive.google.com')) {
                return redirect()->away($document->drive_download_link);
            }
            // Lien stockage cassé sans alternative -> 404 explicite
            return response()->json(['message' => 'Fichier introuvable sur le serveur.', 'hint' => 'Le fichier a été répertorié mais son binaire est manquant.'], 404);
        }
        if (! empty($document->drive_file_id)) {
            return redirect()->away('https://drive.google.com/uc?export=download&id='.$document->drive_file_id);
        }

        return response()->json(['message' => 'Fichier introuvable.'], 404);
    }
}
