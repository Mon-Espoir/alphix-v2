<?php

namespace Database\Seeders;

use App\Models\Course;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Associe les enseignants scrapés (UB) aux cours ALPHIX existants.
 *
 * Source : database/data/teachers_scraped.json (automation/scrape_ub_teachers.py)
 *   [{name, profile_url, faculty, faculty_url, email, courses[{title, pdf_url}], articles[]}]
 *
 * Pour chaque syllabus scrapé, on cherche le cours ALPHIX correspondant :
 *   1. code exact (ex. "PHY3612:" -> courses.code, espaces/casse ignorés) ;
 *   2. nom normalisé (minuscules, sans accents) : égalité ou inclusion forte.
 *
 * En cas de correspondance :
 *   - courses.teacher = nom complet de l'enseignant (si vide ; sinon conservé
 *     et compté comme "déjà renseigné") ;
 *   - courses.description += lien "Profil UB : <url>" (si absent).
 *
 * Idempotent et sûr : aucune création de cours, aucune suppression, aucun
 * écrasement d'un enseignant déjà renseigné.
 */
class TeacherLinksSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/teachers_scraped.json');

        if (! is_file($path)) {
            $this->command->warn("TeacherLinksSeeder : {$path} introuvable, rien à associer.");

            return;
        }

        $teachers = json_decode((string) file_get_contents($path), true);

        if (! is_array($teachers)) {
            $this->command->error('TeacherLinksSeeder : JSON invalide.');

            return;
        }

        $courses = Course::query()->get();
        $byCode = [];
        foreach ($courses as $course) {
            $byCode[self::codeKey((string) $course->code)] = $course;
        }

        $stats = [
            'teachers' => count($teachers),
            'syllabus' => 0,
            'matched' => 0,
            'teacher_filled' => 0,
            'teacher_kept' => 0,
            'link_added' => 0,
        ];
        $samples = [];

        DB::transaction(function () use ($teachers, $courses, $byCode, &$stats, &$samples): void {
            foreach ($teachers as $teacher) {
                $name = trim((string) ($teacher['name'] ?? ''));
                $profileUrl = trim((string) ($teacher['profile_url'] ?? ''));

                if ($name === '') {
                    continue;
                }

                foreach ((array) ($teacher['courses'] ?? []) as $entry) {
                    $title = trim((string) (is_array($entry) ? ($entry['title'] ?? '') : $entry));

                    if ($title === '') {
                        continue;
                    }
                    $stats['syllabus']++;

                    $course = $this->matchCourse($title, $courses, $byCode);

                    if ($course === null) {
                        continue;
                    }
                    $stats['matched']++;

                    if (trim((string) $course->teacher) === '') {
                        $course->teacher = $name;
                        $stats['teacher_filled']++;
                    } else {
                        $stats['teacher_kept']++;
                    }

                    if ($profileUrl !== '' && ! str_contains((string) $course->description, $profileUrl)) {
                        $prefix = trim((string) $course->description) !== '' ? "\n\n" : '';
                        $course->description = trim((string) $course->description)
                            .$prefix.'Profil UB ('.$name.') : '.$profileUrl;
                        $stats['link_added']++;
                    }

                    if ($course->isDirty()) {
                        $course->save();
                    }

                    if (count($samples) < 10) {
                        $samples[] = "« {$title} » -> [{$course->code}] {$course->name} (ens. {$name})";
                    }
                }
            }
        });

        $this->command->info('=== TeacherLinksSeeder ===');
        $this->command->table(['Indicateur', 'Valeur'], [
            ['Enseignants scrapés', $stats['teachers']],
            ['Syllabus scrapés', $stats['syllabus']],
            ['Cours ALPHIX associés', $stats['matched']],
            ['Champ enseignant renseigné', $stats['teacher_filled']],
            ['Enseignant déjà renseigné (conservé)', $stats['teacher_kept']],
            ['Liens profil UB ajoutés', $stats['link_added']],
        ]);
        foreach ($samples as $sample) {
            $this->command->line("  {$sample}");
        }
    }

    /**
     * Cherche le cours ALPHIX correspondant à un titre de syllabus UB.
     */
    private function matchCourse(string $title, $courses, array $byCode): ?Course
    {
        // 1. Code explicite en tête ("PHY3612: Chimie Physique", "CHI 3509 - ...").
        if (preg_match('/^\s*([A-Za-z]{2,10})\s*(\d{3,5})\s*[:\-]/u', $title, $m)) {
            $hit = $byCode[self::codeKey($m[1].$m[2])] ?? null;
            if ($hit instanceof Course) {
                return $hit;
            }
        }

        // 2. Nom normalisé : égalité ou inclusion forte (>= 12 car. communs).
        $clean = self::cleanTitle($title);
        $norm = self::normalize($clean);

        if (mb_strlen($norm) < 6) {
            return null;
        }

        $best = null;
        $bestLen = 0;
        foreach ($courses as $course) {
            $courseNorm = self::normalize((string) $course->name.' '.(string) $course->code);

            if ($norm === $courseNorm) {
                return $course;
            }
            if (str_contains($norm, $courseNorm) || str_contains($courseNorm, $norm)) {
                $len = min(mb_strlen($norm), mb_strlen($courseNorm));
                if ($len >= 12 && $len > $bestLen) {
                    $best = $course;
                    $bestLen = $len;
                }
            }
        }

        return $best;
    }

    /**
     * Retire les suffixes d'édition ("Ed. 2025", dates) pour la comparaison.
     */
    private static function cleanTitle(string $title): string
    {
        $title = (string) preg_replace('/,?\s*Ed\.\s*\d{4}.*$/iu', '', $title);
        $title = (string) preg_replace('/\s*\(\d{4}[^)]*\)\s*$/u', '', $title);

        return trim($title, " \t\n\r\0\x0B-–—:");
    }

    private static function codeKey(string $code): string
    {
        return strtolower((string) preg_replace('/\s+/u', '', $code));
    }

    private static function normalize(string $value): string
    {
        $lower = mb_strtolower(trim($value), 'UTF-8');
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower);
        $flat = $ascii === false ? $lower : strtolower($ascii);

        return trim((string) preg_replace('/\s+/u', ' ', $flat));
    }
}
