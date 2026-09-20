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
 * Import des syllabus reels BAC 3 Biologie (disque -> base ALPHIX).
 *
 * Source : /home/irankunda/Documents/Syllabus/BIOLOGIE BAC III (3 fichiers plats)
 * Robustesse : meme pipeline que ImportBac3ChimieCommand (hash, sanitize, MIME, public copy).
 */
class ImportBac3BiologieCommand extends Command
{
    protected $signature = 'documents:import-bac3-biologie
        {--dry-run : Liste sans ecrire en base}';

    protected $description = 'Importe les syllabus BAC 3 Biologie (BIOLOGIE BAC III) dans ALPHIX';

    private const ROOT = '/home/irankunda/Documents/Syllabus/BIOLOGIE BAC III';

    /** motif ascii minuscule -> course_id */
    private const COURSE_RULES = [
        'conservation' => 49,
        'embryologie' => 55, // Embryologie Animale (BAC3, verifie par pdftotext : embryologie animale)
        'entomologie' => 57,
        'entommologie' => 57, // typo du fichier source "ENTOMMOLOGIE"
    ];

    private const SKIPPED_PREFIXES = ['~$', '.~lock.', '.~', '~'];

    public function handle(UploadService $uploads): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $courses = Course::query()->where('department_id', 3)->where('level_id', 3)->get()->keyBy('id');
        if ($courses->isEmpty()) {
            $this->error('Aucun cours BAC 3 Biologie en base.');

            return self::FAILURE;
        }
        $uploader = User::query()->orderBy('id')->first();
        if ($uploader === null && ! $dryRun) {
            $this->error('Aucun utilisateur.');

            return self::FAILURE;
        }

        if (! is_dir(self::ROOT)) {
            $this->error('Dossier introuvable : '.self::ROOT);

            return self::FAILURE;
        }

        $files = [];
        foreach (new \DirectoryIterator(self::ROOT) as $info) {
            if ($info->isFile()) {
                $files[] = $info->getPathname();
            }
        }
        sort($files);
        $this->info(count($files).' fichier(s) detecte(s).');

        $imported = 0; $skippedDuplicate = 0; $skippedIgnored = 0; $unmatched = 0; $failed = 0;
        $perCourse = [];

        foreach ($files as $absolute) {
            $basename = basename($absolute);
            if ($this->isSkipped($basename, $absolute)) {
                $skippedIgnored++;
                continue;
            }
            $key = mb_strtolower($this->ascii($absolute));
            $courseId = $this->matchCourse($key);
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
            $course = $courses[$courseId];
            $docType = 'syllabus';
            $title = $this->buildTitle($safeName, $course->name, $docType);
            $slug = $this->uniqueSlug($title, $hash);
            $year = $this->extractAcademicYear($safeName) ?? '2025-2026';

            if ($dryRun) {
                $this->line("  [syllabus] {$course->name} <- {$title} ({$mime})");
                $imported++;
                continue;
            }

            try {
                $uuid = (string) Str::uuid();
                $storedName = $uuid.'_'.$safeName;
                $storedRelative = 'documents/'.$storedName;
                $stream = @fopen($absolute, 'rb');
                if ($stream === false) {
                    throw new \RuntimeException('Ouverture impossible.');
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
                    'description' => "Syllabus — {$course->name} (BAC 3 Biologie). Import automatique.",
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
                        'import_batch:bac3-biologie-2026-09',
                        'source:syllabus-biologie',
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

        if (! $dryRun) {
            foreach ($courses as $course) {
                $course->update(['total_documents' => Document::query()->where('course_id', $course->id)->count()]);
            }
        }

        $this->newLine();
        $this->info('=== BILAN IMPORT BAC 3 BIOLOGIE ===');
        $this->table(['Indicateur','Valeur'], [
            ['Fichiers detectes', count($files)],
            ['Documents importes', $imported.($dryRun?' (dry-run)':'')],
            ['Doublons ignores (hash)', $skippedDuplicate],
            ['Ignores (verrous/systeme)', $skippedIgnored],
            ['Sans cours', $unmatched],
            ['Echecs', $failed],
        ]);
        if ($perCourse !== []) {
            $rows = []; foreach ($perCourse as $n=>$c){ $rows[] = [$n,$c]; }
            $this->table(['Cours','Importes'],$rows);
        }

        return self::SUCCESS;
    }

    private function isSkipped(string $basename, string $absolute): bool
    {
        foreach (self::SKIPPED_PREFIXES as $p) if (str_starts_with($basename, $p)) return true;
        if (! is_readable($absolute) || @filesize($absolute) === 0) return true;
        return false;
    }

    private function matchCourse(string $asciiHaystack): ?int
    {
        $normalized = (string) preg_replace('/[_\-\.\/\\\\]+/', ' ', $asciiHaystack);
        $normalized = (string) preg_replace('/\s+/', ' ', $normalized);
        foreach (self::COURSE_RULES as $needle => $cid) {
            if (str_contains($normalized, $this->ascii($needle))) return $cid;
        }
        return null;
    }

    private function buildTitle(string $safeName, string $courseName, string $docType): string
    {
        $base = $safeName;
        for ($i=0;$i<3;$i++){ $ext=pathinfo($base, PATHINFO_EXTENSION); if($ext===''||mb_strlen($ext)>5) break; $base=pathinfo($base, PATHINFO_FILENAME); }
        $base = str_replace(['_','  '], [' ',' '], $base);
        $base = (string) preg_replace('/\s+/u',' ',$base);
        $base = trim($base," .-_\t\n\r\0\x0B");
        $base = $this->fixMojibake($base);
        $base = (string) preg_replace('/^(ecue\s*)+/iu','',$base);
        $base = (string) preg_replace('/\s*\(copie\)\s*/iu',' ',$base);
        $base = (string) preg_replace('/\s+/u',' ',trim($base));
        if($base==='') $base='Document';
        $base = mb_strtoupper(mb_substr($base,0,1)).mb_substr($base,1);
        $base = mb_substr($base,0,200);
        $label = $docType==='syllabus'?'Syllabus':'Document';
        if(str_contains(mb_strtolower($this->ascii($base)), mb_strtolower($this->ascii($courseName)))) return $base.' ('.$label.')';
        return $courseName.' – '.$base.' ('.$label.')';
    }

    private function extractAcademicYear(string $safeName): ?string
    {
        if(preg_match('/(19|20)\d{2}\s*[-_\/]\s*((19|20)?\d{2})/',$safeName,$m)){
            $start=substr($m[0],0,4); $end=trim(substr($m[0],5));
            if(strlen($end)===2) $end=substr($start,0,2).$end;
            if(strlen($end)===4) return $start.'-'.$end;
        }
        if(preg_match('/\b((19|20)\d{2})\b/',$safeName,$m)){ $y=(int)$m[1]; if($y>=1990&&$y<=2035) return $m[1]; }
        return null;
    }

    private function uniqueSlug(string $title, string $hash): string
    {
        $base = Str::slug(mb_substr($title,0,180));
        if($base==='') $base='document';
        $slug=$base.'-'.substr($hash,0,8);
        $i=2; while(Document::query()->where('slug',$slug)->exists()){ $slug=$base.'-'.substr($hash,0,8).'-'.$i; $i++; }
        return mb_substr($slug,0,255);
    }

    private function fixMojibake(string $v): string
    {
        if(!str_contains($v,'Ã')&&!str_contains($v,'Â')) return $v;
        $bytes=mb_convert_encoding($v,'ISO-8859-1','UTF-8');
        if(mb_check_encoding($bytes,'UTF-8')){ $f=mb_convert_encoding($bytes,'UTF-8','UTF-8'); if(is_string($f)&&$f!=='') return $f; }
        return $v;
    }

    private function ascii(string $v): string
    {
        $t=@iconv('UTF-8','ASCII//TRANSLIT//IGNORE',$v);
        if(!is_string($t)||$t==='') $t=$v;
        return strtolower($t);
    }
}
