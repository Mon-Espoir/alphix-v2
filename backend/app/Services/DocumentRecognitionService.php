<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Department;
use App\Models\Faculty;
use Illuminate\Support\Facades\Cache;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Reconnaissance intelligente de documents
 * ---------------------------------------------------------------------------
 * Analyse le NOM du fichier téléversé et déduit, depuis la base réelle
 * (tables faculties / departments / levels / semesters / courses) :
 *   année académique, type, niveau, semestre, faculté, département,
 *   et le cours correspondant.
 *
 * Aucune donnée codée en dur : toutes les correspondances proviennent de
 * requêtes SQL. Règles d'association :
 *   - 1 seul cours correspondant  -> course_id automatique ;
 *   - plusieurs                   -> liste de suggestions (jamais d'invention) ;
 *   - aucun                       -> course_id = null + raison explicite.
 */
class DocumentRecognitionService
{
    /**
     * Analyse un nom de fichier.
     *
     * @return array{
     *   academic_year: string|null,
     *   doc_type: string|null,
     *   level_code: string|null,
     *   semester_code: string|null,
     *   faculty: array|null,
     *   department: array|null,
     *   course_id: int|null,
     *   course: array|null,
     *   suggestions: list<array>,
     *   reason: string|null
     * }
     */
    public function recognize(string $filename): array
    {
        $normalized = $this->normalize($filename);
        $tokens = $this->tokens($normalized);

        // --- Année académique -------------------------------------------
        $academicYear = null;
        if (preg_match('/(20\d{2})\s*[-_\/ ]?\s*(20\d{2})/', $normalized, $m)) {
            $academicYear = "{$m[1]}-{$m[2]}";
        } elseif (preg_match('/\b(20\d{2})\b/', $normalized, $m)) {
            $academicYear = $m[1];
        }

        // --- Type de document --------------------------------------------
        $docTypeMap = [
            'syllabus' => 'syllabus',
            'examen' => 'exam', 'exam' => 'exam',
            'correction' => 'correction',
            'tp' => 'tp',
            'td' => 'td',
            'resume' => 'summary', 'résumé' => 'summary',
            'rapport' => 'report',
            'memoire' => 'thesis', 'mémoire' => 'thesis', 'these' => 'thesis', 'thèse' => 'thesis',
            'presentation' => 'presentation', 'diapos' => 'presentation',
            'livre' => 'book', 'manuel' => 'book',
            'cours' => 'course',
        ];
        $docType = null;
        foreach ($docTypeMap as $needle => $type) {
            if (str_contains($normalized, $this->normalize($needle))) {
                $docType = $type;
                break;
            }
        }

        // --- Niveau -------------------------------------------------------
        $levelCode = null;
        // BAC suivi d'un chiffre ou de chiffres romains (I, II, III)
        if (preg_match('/\bbac[a-z]*\s*(?:-)?\s*([123])\b/i', $normalized, $m)) {
            $levelCode = 'BAC'.$m[1];
        } elseif (preg_match('/\bbac(?:[a-z]*)?\s+(i{1,3})\b/i', $normalized, $m)) {
            $roman = ['i' => 1, 'ii' => 2, 'iii' => 3];
            $levelCode = 'BAC'.($roman[strtolower($m[1])] ?? null);
        }
        if ($levelCode === null && preg_match('/\bmaster\s*([12])\b|\bm([12])\b/i', $normalized, $m)) {
            $levelCode = 'M'.($m[1] ?? $m[2]);
        }

        // --- Semestre -----------------------------------------------------
        $semesterCode = null;
        if (preg_match('/\bsemestre\s*([12])\b|\bs\s*([12])\b/i', $normalized, $m)) {
            $semesterCode = 'S'.($m[1] ?? $m[2]);
        }

        // --- Facultés & départements (base réelle) -------------------------
        $matchedFaculty = null;
        $matchedDepartment = null;

        foreach (Faculty::query()->get(['id', 'code', 'name']) as $faculty) {
            if ($this->matchesEntity($normalized, $tokens, $faculty->code, $faculty->name)) {
                $matchedFaculty = ['id' => $faculty->id, 'code' => $faculty->code, 'name' => $faculty->name];
                break;
            }
        }

        foreach (Department::query()->get(['id', 'code', 'name', 'faculty_id']) as $department) {
            if ($this->matchesEntity($normalized, $tokens, $department->code, $department->name)) {
                $matchedDepartment = [
                    'id' => $department->id,
                    'code' => $department->code,
                    'name' => $department->name,
                    'faculty_id' => $department->faculty_id,
                ];
                break;
            }
        }

        // --- Cours : scoring sur toute la table courses --------------------
        // Signal fort : tokens du NOM du cours / code exact présents dans le
        // fichier. Signal faible : contexte (niveau, semestre, département,
        // faculté). Unicité : le meilleur doit devancer le second d'au moins
        // 2 points, sinon -> suggestions (jamais d'invention).
        $candidates = [];
        foreach (Course::query()->with('department')->get() as $course) {
            $score = 0;
            $strong = false;

            // Code exact présent comme token (ex. "chi3612")
            $courseCode = $this->normalize((string) $course->code);
            if ($courseCode !== '' && in_array($courseCode, $tokens, true)) {
                $score += 8;
                $strong = true;
            }

            // Tokens significatifs du nom du cours présents dans le nom de fichier
            $nameTokens = array_filter(
                $this->tokens($this->normalize((string) $course->name)),
                fn ($t) => mb_strlen($t) >= 4 && ! is_numeric($t)
            );
            foreach ($nameTokens as $nt) {
                if (in_array($nt, $tokens, true)) {
                    $score += 3;
                    $strong = true;
                }
            }

            if ($levelCode !== null && optional($course->level)->code === $levelCode) {
                $score += 1;
            }
            if ($semesterCode !== null && optional($course->semester)->code === $semesterCode) {
                $score += 1;
            }
            if ($matchedDepartment !== null && (int) $course->department_id === (int) $matchedDepartment['id']) {
                $score += 2;
            }
            if ($matchedFaculty !== null && optional($course->department)->faculty_id === $matchedFaculty['id']) {
                $score += 1;
            }

            if ($score >= 4) {
                $candidates[$course->id] = ['course' => $course, 'score' => $score, 'strong' => $strong];
            }
        }

        usort($candidates, fn ($a, $b) => $b['score'] <=> $a['score']);

        $suggestions = array_map(
            static fn (array $c) => [
                'course_id' => $c['course']->id,
                'code' => $c['course']->code,
                'name' => $c['course']->name,
                'department' => optional($c['course']->department)->name,
                'faculty_id' => optional($c['course']->department)->faculty_id,
                'score' => $c['score'],
            ],
            array_slice($candidates, 0, 5)
        );

        $courseId = null;
        $courseView = null;
        $reason = null;

        $bestScore = $candidates[0]['score'] ?? 0;
        $runnerScore = $candidates[1]['score'] ?? 0;
        $bestStrong = $candidates[0]['strong'] ?? false;

        if (count($candidates) === 1 || ($bestScore - $runnerScore) >= 2) {
            if (! $bestStrong) {
                // Correspondance uniquement contextuelle (ex. un seul mot
                // générique "chimie") : association refusée, suggestions only.
                $courseId = null;
                $reason = 'Correspondance uniquement contextuelle — signal fort requis pour l\'association automatique.';
            } else {
                $best = $candidates[0]['course'];
                $courseId = $best->id;
                $courseView = [
                    'course_id' => $best->id,
                    'code' => $best->code,
                    'name' => $best->name,
                    'department' => optional($best->department)->name,
                    'faculty_id' => optional($best->department)->faculty_id,
                ];
                if ($candidates[1] ?? false) {
                    $reason = 'Association automatique par dominance de score.';
                }
            }
        } elseif (count($candidates) > 1) {
            $reason = 'Plusieurs cours correspondent — sélection manuelle requise.';
        } else {
            $reason = "Aucun cours ne correspond au nom de fichier dans la base — course_id laissé à null.";
        }

        return [
            'academic_year' => $academicYear,
            'doc_type' => $docType,
            'level_code' => $levelCode,
            'semester_code' => $semesterCode,
            'faculty' => $matchedFaculty,
            'department' => $matchedDepartment,
            'course_id' => $courseId,
            'course' => $courseView,
            'suggestions' => $suggestions,
            'reason' => $reason,
        ];
    }

    /** Normalisation : minuscules + suppression des accents. */
    protected function normalize(string $value): string
    {
        $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', mb_strtolower(trim($value)));

        return strtolower($transliterated !== false ? $transliterated : mb_strtolower(trim($value)));
    }

    /** Découpe en tokens alphanumériques. */
    protected function tokens(string $normalized): array
    {
        return array_values(array_filter(preg_split('/[^a-z0-9]+/', $normalized), fn ($t) => $t !== ''));
    }

    /** Vérifie si un code ou un nom d'entité apparaît dans le nom de fichier.
     *  Un nom composé d'un SEUL mot générique ne suffit jamais (anti-bruit). */
    protected function matchesEntity(string $normalized, array $tokens, ?string $code, ?string $name): bool
    {
        // Code court explicite (ex. "FS", "CHM", "CHI")
        if ($code && strlen($code) >= 2) {
            $codeNorm = $this->normalize($code);
            if (in_array($codeNorm, $tokens, true)) {
                return true;
            }
        }
        if (! $name || mb_strlen($name) < 5) {
            return false;
        }

        $nameNorm = $this->normalize($name);
        $nameTokens = array_values(array_filter(
            $this->tokens($nameNorm),
            fn ($t) => mb_strlen($t) >= 4 && ! is_numeric($t)
        ));

        // Nom complet multi-mots contenu tel quel
        if (count($nameTokens) >= 2 && str_contains($normalized, $nameNorm)) {
            return true;
        }

        // Intersection forte : au moins 2 tokens distincts présents
        if (count($nameTokens) >= 2) {
            $hits = array_filter($nameTokens, fn ($t) => in_array($t, $tokens, true));
            if (count($hits) >= 2) {
                return true;
            }
        }

        return false;
    }
}
