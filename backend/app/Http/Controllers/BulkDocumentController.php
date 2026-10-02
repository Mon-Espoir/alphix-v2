<?php

namespace App\Http\Controllers;

use App\Http\Resources\DocumentResource;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Import massif de documents déjà présents sur Google Drive.
 *
 * Pourquoi cette route existe :
 *   - le flux classique POST /documents fait transiter les OCTETS par le
 *     backend (upload -> stockage local -> rclone). Sur Render Free
 *     (512 Mo) et surtout derrière le Cloudflare de Render, cela déclenche
 *     des "Just a moment..." qui bloquent la navigation des étudiants ;
 *   - un import de masse n'a pas besoin de ces octets : on peut pousser
 *     les fichiers DIRECTEMENT sur Drive (rclone côté machine), puis
 *     declarer uniquement les metadonnees.
 *
 * Securite : reserve aux administrateurs (middleware check.role sur la
 * route). Chaque entree est validee independamment ; une entree invalide
 * n'annule pas le lot (on veut un import resumable).
 */
class BulkDocumentController extends Controller
{
    private const DOC_TYPES = [
        'course', 'tp', 'td', 'exam', 'correction', 'syllabus', 'summary',
        'book', 'thesis', 'report', 'presentation', 'video',
        'external_link', 'other',
    ];

    /**
     * Declenche des metadonnees pour plusieurs fichiers deja sur Drive.
     */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'documents' => ['required', 'array', 'min:1', 'max:100'],
            'documents.*.course_id' => ['required', 'integer', 'exists:courses,id'],
            'documents.*.title' => ['required', 'string', 'max:255'],
            'documents.*.original_name' => ['required', 'string', 'max:255'],
            'documents.*.doc_type' => ['required', 'string', Rule::in(self::DOC_TYPES)],
            'documents.*.drive_file_id' => ['required', 'string', 'max:120'],
            'documents.*.file_hash' => ['required', 'string', 'size:64'],
            'documents.*.slug' => ['nullable', 'string', 'max:255'],
            'documents.*.file_size' => ['nullable', 'integer', 'min:0'],
            'documents.*.mime_type' => ['nullable', 'string', 'max:100'],
            'documents.*.academic_year' => ['nullable', 'string', 'max:20'],
            'documents.*.description' => ['nullable', 'string'],
            'documents.*.status' => [
                'nullable', 'string',
                Rule::in(['pending', 'processing', 'approved', 'rejected', 'archived']),
            ],
            'documents.*.visibility' => [
                'nullable', 'string',
                Rule::in(['public', 'faculty', 'department', 'private']),
            ],
            'documents.*.metadata' => ['nullable', 'array'],
            'documents.*.metadata.*' => ['string'],
        ], [], [
            'documents' => 'documents',
            'documents.*.course_id' => 'cours',
            'documents.*.title' => 'titre',
            'documents.*.original_name' => 'nom original',
            'documents.*.doc_type' => 'type',
            'documents.*.drive_file_id' => 'identifiant Drive',
            'documents.*.file_hash' => 'empreinte',
        ]);

        $created = [];
        $skipped = [];

        foreach ($payload['documents'] as $index => $row) {
            $existing = Document::where('file_hash', $row['file_hash'])->first();
            if ($existing !== null) {
                $skipped[] = ['index' => $index, 'reason' => 'deja importe',
                    'id' => $existing->id];

                continue;
            }

            $driveId = (string) $row['drive_file_id'];
            $slug = $row['slug'] ?? Str::slug($row['title']).'-'.substr($row['file_hash'], 0, 8);
            $slug = substr($slug, 0, 250);
            if (Document::where('slug', $slug)->exists()) {
                $slug = $slug.'-'.substr($row['file_hash'], 0, 6);
            }

            $metadata = array_merge($row['metadata'] ?? [], [
                'transfer:rclone-direct',
                'transfer:bulk-import',
                'source:drive-preloaded',
                "drive_file_id:{$driveId}",
            ]);

            $document = Document::create([
                'uuid' => (string) Str::uuid(),
                'course_id' => $row['course_id'],
                'user_id' => $request->user()?->id,
                'title' => $row['title'],
                'original_name' => $row['original_name'],
                'slug' => $slug,
                'description' => $row['description'] ?? null,
                'doc_type' => $row['doc_type'],
                'academic_year' => $row['academic_year'] ?? null,
                'mime_type' => $row['mime_type'] ?? null,
                'file_size' => $row['file_size'] ?? null,
                'file_hash' => $row['file_hash'],
                'drive_file_id' => $driveId,
                'drive_web_view_link' => "https://drive.google.com/file/d/{$driveId}/view",
                'drive_download_link' => "https://drive.google.com/uc?export=download&id={$driveId}",
                'visibility' => $row['visibility'] ?? 'public',
                'status' => $row['status'] ?? 'approved',
                'metadata' => $metadata,
                'published_at' => now(),
            ]);

            $created[] = [
                'index' => $index,
                'id' => $document->id,
                'title' => $document->title,
                'drive_file_id' => $driveId,
            ];
        }

        return response()->json([
            'message' => count($created).' document(s) enregistre(s), '.count($skipped).' ignore(s).',
            'data' => [
                'created' => $created,
                'skipped' => $skipped,
            ],
        ], count($created) > 0 ? 201 : 200);
    }
}