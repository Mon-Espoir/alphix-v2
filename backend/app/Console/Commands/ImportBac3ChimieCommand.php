<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\Document;
use App\Models\User;
use App\Services\UploadService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Import massif des documents reels BAC 3 Chimie (disque -> base ALPHIX).
 *
 * Sources :
 *   /home/irankunda/Documents/Syllabus/BAC III CHIMIE  -> doc_type syllabus/course
 *   /home/irankunda/Documents/Examens                  -> doc_type exam/tp/td/...
 *   (seuls les semestres 5 et 6 = BAC 3 Chimie sont parcourus)
 *
 * Robustesse : fichiers ignores (verrous Office ~$, 0 octet), hash SHA-256 en
 * streaming, deduplication par file_hash, noms assainis (accents conserves,
 * controles supprimes), MIME detecte via finfo + repli extension, copie
 * physique vers le disque public, poursuite sur erreur par fichier.
 */
class ImportBac3ChimieCommand extends Command
{
    protected $signature = 'documents:import-bac3-chimie
        {--dry-run : Liste les actions sans rien ecrire en base}
        {--limit=0 : Nombre max de fichiers a traiter (0 = tous)}';

    protected $description = 'Importe les documents BAC 3 Chimie (Syllabus + Examens S5/S6) dans ALPHIX';

    private const SYLLABUS_ROOT = '/home/irankunda/Documents/Syllabus/BAC III CHIMIE';

    private const EXAMENS_S5 = '/home/irankunda/Documents/Examens/Tuyaux Semestre 5';

    private const EXAMENS_S6 = '/home/irankunda/Documents/Examens/Tuyaux Semestre 6';

    private const IMAGES_ROOT = '/home/irankunda/Images/IMAGES Examens BAC III CHIMIE';

    /**
     * Regles de correspondance dossier/fichier -> cours (ordre = priorite).
     * Cle : motif (sans accents, minuscules). Valeur : id du cours.
     *
     * @var array<string, int>
     */
    private const COURSE_RULES = [
        'structure electronique' => 114,
        'methelectron' => 114,
        'methode de structure' => 114,
        'physique moleculaire' => 113,
        'moleculaire' => 113,
        'calcul physico' => 108,
        'physicochimique' => 108,
        'physico' => 108,
        'cinetique' => 1,
        'biochimie clinique' => 105,
        'biochimie metabolique' => 104,
        'biochimie metabo' => 104,
        'bio meta' => 104,
        ' bm ' => 104,
        'coordination' => 102,
        'analyse chimique instrumentale' => 103,
        'analyses chimiques instrumentales' => 103,
        'analyse chique instr' => 103,
        'spectroscopie' => 103,
        'chromatographie' => 103,
        'industrielle' => 101,
        'mecanismes reactionnels' => 106,
        'synthese organique' => 107,
        'heterocyclique' => 115,
        'heterocycle' => 115,
        'heterocylique' => 115,
        'pharmacognosie' => 116,
        'polymere' => 112,
        'environnement' => 111,
        'methode et technique de la recherche' => 109,
        'methode et technique de recherche' => 109,
        'methodes et techniques de recherche' => 109,
        'methodes et technique de recherche' => 109,
        'methode et techniques de recherche' => 109,
        'methode et techinque' => 109,
        'methode et tecniq' => 109,
        'methodes et tecniq' => 109,
        'tecniq recherche' => 109,
        'methodo et tecniq' => 109,
        'technique de recherche' => 109,
        'entrepreneuriat' => 110,
    ];

    /** Extensions ignorees (verrous Office, fichiers systeme). */
    private const SKIPPED_PREFIXES = ['~$', '.~lock.', '.~', '~'];

    public function handle(UploadService $uploads): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(0, (int) $this->option('limit'));

        $courses = Course::query()->where('department_id', 1)->where('level_id', 3)->get()->keyBy('id');
        if ($courses->isEmpty()) {
            $this->error('Aucun cours BAC 3 Chimie en base. Import annule.');

            return self::FAILURE;
        }

        $uploader = User::query()->orderBy('id')->first();
        if ($uploader === null && ! $dryRun) {
            $this->error('Aucun utilisateur en base pour attribuer les documents.');

            return self::FAILURE;
        }

        $files = $this->collectFiles();
        $this->info(count($files)." fichier(s) detecte(s) sur le disque.");

        $imported = 0;
        $skippedDuplicate = 0;
        $skippedIgnored = 0;
        $unmatched = 0;
        $failed = 0;
        $perCourse = [];
        $processed = 0;

        foreach ($files as $item) {
            if ($limit > 0 && $processed >= $limit) {
                break;
            }
            $processed++;
            [$absolute, $source] = $item;
            $basename = basename($absolute);

            if ($this->isSkipped($basename, $absolute)) {
                $skippedIgnored++;
                continue;
            }

            $relativeKey = mb_strtolower($this->ascii($absolute));

            $courseId = $this->matchCourse($relativeKey);
            if ($courseId === null || ! isset($courses[$courseId])) {
                $unmatched++;
                $this->warn("Sans cours : {$absolute}");
                continue;
            }

            $hash = @hash_file('sha256', $absolute);
            if (! is_string($hash) || $hash === '') {
                $failed++;
                $this->warn("Hash impossible : {$absolute}");
                continue;
            }

            if (Document::query()->where('file_hash', $hash)->exists()) {
                $skippedDuplicate++;
                continue;
            }

            $safeName = $uploads->sanitizeFileName(trim($basename));
            $mime = $uploads->detectMimeTypeForPath($absolute, $safeName);
            $size = @filesize($absolute) ?: 0;

            $docType = $this->detectDocType($safeName, $source, $mime);
            $course = $courses[$courseId];
            $title = $this->buildTitle($safeName, $course->name, $docType);
            $slug = $this->uniqueSlug($title, $hash);
            $year = $this->extractAcademicYear($safeName) ?? '2025-2026';

            if ($dryRun) {
                $this->line("  [{$source}/{$docType}] {$course->name} <- {$title}");
                $imported++;
                continue;
            }

            try {
                $uuid = (string) Str::uuid();
                $storedName = $uuid.'_'.$safeName;
                $storedRelative = 'documents/'.$storedName;

                $stream = @fopen($absolute, 'rb');
                if ($stream === false) {
                    throw new \RuntimeException('Ouverture du fichier source impossible.');
                }
                try {
                    Storage::disk('public')->put($storedRelative, $stream);
                } finally {
                    fclose($stream);
                }

                $publicUrl = Storage::disk('public')->url($storedRelative);

                Document::query()->create([
                    'uuid' => $uuid,
                    'course_id' => $courseId,
                    'user_id' => $uploader->id,
                    'title' => mb_substr($title, 0, 255),
                    'original_name' => mb_substr($safeName, 0, 255),
                    'slug' => $slug,
                    'description' => "Document {$this->typeLabel($docType)} — {$course->name} (BAC 3 Chimie). Import automatique depuis le disque.",
                    'doc_type' => $docType,
                    'academic_year' => $year,
                    'language' => 'fr',
                    'mime_type' => mb_substr($mime, 0, 100),
                    'file_size' => $size,
                    'file_hash' => $hash,
                    'drive_web_view_link' => $publicUrl,
                    'drive_download_link' => $publicUrl,
                    'version' => '1.0',
                    'visibility' => 'public',
                    'status' => 'approved',
                    'published_at' => now(),
                    'metadata' => [
                        'import_batch:bac3-chimie-2026-09',
                        "source:{$source}",
                        "source_path:{$absolute}",
                        "local_path:{$storedRelative}",
                        'transfer:local-import',
                    ],
                ]);

                $imported++;
                $perCourse[$course->name] = ($perCourse[$course->name] ?? 0) + 1;
            } catch (\Throwable $e) {
                $failed++;
                report($e);
                $this->warn('Echec ('.$e->getMessage().') : '.$absolute);
            }
        }

        // Recalcule les compteurs de documents par cours.
        if (! $dryRun) {
            foreach ($courses as $course) {
                $course->update([
                    'total_documents' => Document::query()->where('course_id', $course->id)->count(),
                ]);
            }
        }

        $this->newLine();
        $this->info('=== BILAN IMPORT BAC 3 CHIMIE ===');
        $this->table(
            ['Indicateur', 'Valeur'],
            [
                ['Fichiers detectes', count($files)],
                ['Documents importes', $imported.($dryRun ? ' (dry-run)' : '')],
                ['Doublons ignores (hash)', $skippedDuplicate],
                ['Fichiers ignores (verrous/systeme)', $skippedIgnored],
                ['Sans cours correspondant', $unmatched],
                ['Echecs', $failed],
            ]
        );

        if ($perCourse !== []) {
            $rows = [];
            foreach ($perCourse as $name => $count) {
                $rows[] = [$name, $count];
            }
            $this->table(['Cours', 'Importes'], $rows);
        }

        return self::SUCCESS;
    }

    /**
     * @return list<array{0: string, 1: string}>
     */
    private function collectFiles(): array
    {
        $out = [];
        $roots = [
            self::SYLLABUS_ROOT => 'syllabus',
            self::EXAMENS_S5 => 'examens-s5',
            self::EXAMENS_S6 => 'examens-s6',
            self::IMAGES_ROOT => 'images-bac3',
        ];

        foreach ($roots as $root => $source) {
            if (! is_dir($root)) {
                $this->warn("Dossier introuvable : {$root}");
                continue;
            }
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );
            /** @var \SplFileInfo $info */
            foreach ($iterator as $info) {
                if ($info->isFile()) {
                    $out[] = [$info->getPathname(), $source];
                }
            }
        }

        sort($out);

        return $out;
    }

    private function isSkipped(string $basename, string $absolute): bool
    {
        foreach (self::SKIPPED_PREFIXES as $prefix) {
            if (str_starts_with($basename, $prefix)) {
                return true;
            }
        }
        if (! is_readable($absolute) || @filesize($absolute) === 0) {
            return true;
        }

        return false;
    }

    private function matchCourse(string $asciiHaystack): ?int
    {
        // Normalise les separateurs (tirets, underscores, points, slashs) pour
        // que "Chimie_Physique_Calculs_physicochimiques" matche aussi.
        $normalized = (string) preg_replace('/[_\-\.\/\\\\]+/', ' ', $asciiHaystack);
        $normalized = (string) preg_replace('/\s+/', ' ', $normalized);

        foreach (self::COURSE_RULES as $needle => $courseId) {
            if (str_contains($normalized, $this->ascii($needle))) {
                return $courseId;
            }
        }

        return null;
    }

    private function detectDocType(string $safeName, string $source, string $mime): string
    {
        $n = mb_strtolower($this->ascii($safeName));

        if ($mime === 'video/mp4') {
            return 'video';
        }

        if (str_contains($n, 'corrige') || str_contains($n, 'corrıge') || str_contains($n, 'correction') || str_contains($n, 'grille')) {
            return 'correction';
        }
        if ($source === 'syllabus') {
            if (str_contains($n, 'exercice') || str_contains($n, 'exercise') || str_contains($n, 'fiche-td') || str_contains($n, 'td-') || str_contains($n, ' td')) {
                return 'td';
            }
            if (str_contains($n, 'travaux pratique') || str_contains($n, 'travail pratique') || str_contains($n, 'tp ') || str_starts_with($n, 'tp')) {
                return 'tp';
            }
            if (str_contains($n, 'chapitre') || str_contains($n, 'chapter') || str_contains($n, 'cours') || str_contains($n, 'course')) {
                return 'course';
            }

            return 'syllabus';
        }

        if (str_contains($n, 'rapport') || str_contains($n, 'visite') || str_contains($n, 'stage') || str_contains($n, 'memoire')) {
            return 'report';
        }
        if (str_contains($n, 'expose') || str_contains($n, 'presentation') || str_contains($n, 'powerpoint')) {
            return 'presentation';
        }
        if (str_contains($n, 'travaux pratique') || str_contains($n, 'travail pratique') || str_contains($n, 'manip') || (bool) preg_match('/\btp\b/', $n)) {
            return 'tp';
        }
        if (str_contains($n, 'exercice') || str_contains($n, 'exercise') || str_contains($n, 'fiche-td') || (bool) preg_match('/\btd\b/', $n)) {
            return 'td';
        }
        if (str_ends_with($n, '.md') || str_contains($n, 'synthese_examens') || str_contains($n, 'resume')) {
            return 'summary';
        }

        return 'exam';
    }

    private function buildTitle(string $safeName, string $courseName, string $docType): string
    {
        // Retire les (multi-)extensions : .docx.pdf, .pdf.odt, .tar.gz...
        $base = $safeName;
        for ($i = 0; $i < 3; $i++) {
            $ext = pathinfo($base, PATHINFO_EXTENSION);
            if ($ext === '' || mb_strlen($ext) > 5) {
                break;
            }
            $base = pathinfo($base, PATHINFO_FILENAME);
        }

        $base = str_replace(['_', '  '], [' ', ' '], $base);
        $base = (string) preg_replace('/\s+/u', ' ', $base);
        $base = trim($base, " .-_\t\n\r\0\x0B");
        // Repare le mojibake (noms encodes en Latin-1 relus en UTF-8 :
        // "MolÃ©culaire" -> "Moléculaire").
        $base = $this->fixMojibake($base);

        // Prefixes parasites : ECUE, tuyaux, BAC III CHIMIE, annees...
        $base = (string) preg_replace('/^(ecue\s*)+/iu', '', $base);
        $base = (string) preg_replace('/^(tuyaux?(\s+de)?\s*)+/iu', '', $base);
        $base = (string) preg_replace('/\s*\bBAC\s*II{0,3}\s*(CHIMIE)?\b\s*/iu', ' ', $base);
        $base = (string) preg_replace('/\s*\(copie\)\s*/iu', ' ', $base);
        $base = (string) preg_replace('/,\s*,+/', ',', $base);
        $base = (string) preg_replace('/\s+/u', ' ', trim($base));

        if ($base === '') {
            $base = 'Document';
        }

        // Capitalise la premiere lettre, le reste inchange (formules, sigles).
        $base = mb_strtoupper(mb_substr($base, 0, 1)).mb_substr($base, 1);
        $base = mb_substr($base, 0, 200);

        $label = $this->typeLabel($docType);

        // Evite "Chimie heterocyclique – Chimie heterocyclique (Examen)".
        if (str_contains(mb_strtolower($this->ascii($base)), mb_strtolower($this->ascii($courseName)))) {
            return $base.' ('.$label.')';
        }

        return $courseName.' – '.$base.' ('.$label.')';
    }

    private function typeLabel(string $docType): string
    {
        return match ($docType) {
            'syllabus' => 'Syllabus',
            'course' => 'Cours',
            'exam' => 'Examen',
            'correction' => 'Correction',
            'td' => 'TD',
            'tp' => 'TP',
            'report' => 'Rapport',
            'presentation' => 'Exposé',
            'summary' => 'Synthèse',
            'video' => 'Vidéo',
            default => 'Document',
        };
    }

    private function extractAcademicYear(string $safeName): ?string
    {
        if (preg_match('/(19|20)\d{2}\s*[-_\/]\s*((19|20)?\d{2})/', $safeName, $m)) {
            $start = substr($m[0], 0, 4);
            $end = trim(substr($m[0], 5));
            if (strlen($end) === 2) {
                $end = substr($start, 0, 2).$end;
            }
            if (strlen($end) === 4) {
                return $start.'-'.$end;
            }
        }
        if (preg_match('/\b((19|20)\d{2})\b/', $safeName, $m)) {
            $year = (int) $m[1];
            if ($year >= 1990 && $year <= 2035) {
                return $m[1];
            }
        }

        return null;
    }

    private function uniqueSlug(string $title, string $hash): string
    {
        $base = Str::slug(mb_substr($title, 0, 180));
        if ($base === '') {
            $base = 'document';
        }
        $slug = $base.'-'.substr($hash, 0, 8);
        $i = 2;
        while (Document::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.substr($hash, 0, 8).'-'.$i;
            $i++;
        }

        return mb_substr($slug, 0, 255);
    }

    /**
     * Repare le mojibake Latin-1 relu en UTF-8 ("MolÃ©culaire").
     */
    private function fixMojibake(string $value): string
    {
        if (! str_contains($value, 'Ã') && ! str_contains($value, 'Â')) {
            return $value;
        }
        $bytes = mb_convert_encoding($value, 'ISO-8859-1', 'UTF-8');
        if (mb_check_encoding($bytes, 'UTF-8')) {
            $fixed = mb_convert_encoding($bytes, 'UTF-8', 'UTF-8');
            if (is_string($fixed) && $fixed !== '') {
                return $fixed;
            }
        }

        return $value;
    }

    /**
     * Minuscules sans accents pour une correspondance insensible aux accents.
     */
    private function ascii(string $value): string
    {        $trans = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if (! is_string($trans) || $trans === '') {
            $trans = $value;
        }

        return strtolower($trans);
    }
}
