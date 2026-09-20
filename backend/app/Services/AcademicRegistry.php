<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Registre académique officiel (Single Source of Truth)
 * ---------------------------------------------------------------------------
 * Source unique : /ub_departements_json/*.json à la racine du dépôt.
 * Chaque JSON contient {faculty, department, tracks?, courses[]}.
 * Service lecture seule, sans mutation, utilisé par UbAcademicSeeder et
 * potentiellement par l'automatisation Python (via même dossier).
 *
 * Aucun JSON n'est déplacé ni recréé — ce service ne fait que lire.
 */
class AcademicRegistry
{
    /**
     * Chemin définitif des JSON (Single Source of Truth).
     * Respecte l'architecture existante : dossier à la racine du projet
     * (projet/ub_departements_json), accessible depuis le backend via
     * base_path('../ub_departements_json').
     */
    public static function sourcePath(): string
    {
        $candidate = base_path('../ub_departements_json');

        if (is_dir($candidate)) {
            return realpath($candidate) ?: $candidate;
        }

        // Fallback: backend/ub_departements_json (si copié)
        $fallback = base_path('ub_departements_json');

        if (is_dir($fallback)) {
            return realpath($fallback) ?: $fallback;
        }

        // Dernier recours: chemin absolu projet
        $projectRoot = dirname(base_path());
        $rootPath = $projectRoot . '/ub_departements_json';

        if (is_dir($rootPath)) {
            return realpath($rootPath) ?: $rootPath;
        }

        return $candidate;
    }

    /**
     * Liste tous les fichiers JSON du registre.
     *
     * @return list<string> Chemins absolus
     */
    public static function jsonFiles(): array
    {
        $path = static::sourcePath();

        if (! File::isDirectory($path)) {
            return [];
        }

        return collect(File::files($path))
            ->filter(fn ($f) => $f->getExtension() === 'json')
            ->map(fn ($f) => $f->getRealPath())
            ->values()
            ->all();
    }

    /**
     * Charge et décode tous les JSON en structure normalisée.
     *
     * @return list<array{file: string, faculty: ?array, department: ?array, tracks: array, courses: array}>
     */
    public static function loadAll(): array
    {
        $entries = [];

        foreach (static::jsonFiles() as $file) {
            $raw = File::get($file);
            $data = json_decode($raw, true);

            if (! is_array($data)) {
                continue;
            }

            // géologie.json peut être {} ou {faculty:null, department:null}
            $faculty = $data['faculty'] ?? null;
            $department = $data['department'] ?? null;
            $tracks = $data['tracks'] ?? [];
            $courses = $data['courses'] ?? [];

            // Normalise tracks: null -> []
            if (! is_array($tracks)) {
                $tracks = [];
            }
            if (! is_array($courses)) {
                $courses = [];
            }

            // Format hérité FSI : {faculty, department, levels: [{level, option, semesters: [{semester, courses[]}]}]}
            // (departement_tic, departement_electro_mecanique, departement_genie_civil,
            //  departement_amenagement_urbanisme). On aplati vers {tracks, courses}
            // sans jamais modifier les JSON (lecture seule).
            $levels = $data['levels'] ?? null;
            if (is_array($levels) && count($levels) > 0) {
                $flattened = static::flattenLevels($levels);
                // Fusionne les tracks dérivées des options avec les tracks déclarées (si présentes)
                $existingCodes = [];
                foreach ($tracks as $t) {
                    if (is_array($t) && isset($t['code'])) {
                        $existingCodes[strtoupper(trim((string) $t['code']))] = true;
                    }
                }
                foreach ($flattened['tracks'] as $t) {
                    $c = strtoupper(trim((string) ($t['code'] ?? '')));
                    if ($c === '' || isset($existingCodes[$c])) {
                        continue;
                    }
                    $tracks[] = $t;
                    $existingCodes[$c] = true;
                }
                foreach ($flattened['courses'] as $c) {
                    $courses[] = $c;
                }
            }

            // Ignore fichiers vides (géologie.json)
            if (empty($faculty) && empty($department) && empty($courses)) {
                continue;
            }

            $entries[] = [
                'file' => $file,
                'faculty' => is_array($faculty) ? $faculty : null,
                'department' => is_array($department) ? $department : null,
                'tracks' => $tracks,
                'courses' => $courses,
            ];
        }

        return $entries;
    }

    /**
     * Aplati le format hérité `levels` (FSI) vers {tracks, courses} plats.
     *
     * Chaque level = {level: "BAC I", option: "Génie Logiciel"|"Tronc Commun"|"",
     *   semesters: [{semester: 1, courses: [{code, name, credits, hours, ...}]}]}.
     * Règles (lecture seule, sans mutation des JSON) :
     * - option vide, "Tronc Commun" ou "Identique..." = tronc commun (track '').
     * - toute autre option distincte devient une track déclarée (code dérivé).
     * - chaque cours hérite du numéro de semestre global + de son option comme track.
     *
     * @param  array  $levels
     * @return array{tracks: list<array{code: string, name: string}>, courses: list<array>}
     */
    public static function flattenLevels(array $levels): array
    {
        $tracks = [];
        $courses = [];
        $seenOptions = [];

        foreach ($levels as $level) {
            if (! is_array($level)) {
                continue;
            }

            $option = trim((string) ($level['option'] ?? ''));
            $semesters = $level['semesters'] ?? [];

            if (! is_array($semesters)) {
                continue;
            }

            $isCommon = $option === ''
                || stripos($option, 'tronc commun') !== false
                || stripos($option, 'identique') !== false;

            if (! $isCommon && $option !== '' && ! isset($seenOptions[mb_strtolower($option)])) {
                $seenOptions[mb_strtolower($option)] = true;
                $tracks[] = [
                    'code' => static::codeFromName($option, 'TRK'),
                    'name' => $option,
                ];
            }

            foreach ($semesters as $sem) {
                if (! is_array($sem)) {
                    continue;
                }

                $semNum = (int) ($sem['semester'] ?? $sem['semestre'] ?? 1);
                $semCourses = $sem['courses'] ?? [];

                if (! is_array($semCourses)) {
                    continue;
                }

                foreach ($semCourses as $course) {
                    if (! is_array($course)) {
                        continue;
                    }

                    $flat = $course;
                    $flat['semester'] = $semNum;
                    // Préserve un track explicite déjà présent, sinon hérite de l'option
                    $existingTrack = trim((string) ($flat['track'] ?? ''));
                    if ($existingTrack === '') {
                        $flat['track'] = $isCommon ? '' : $option;
                    }

                    $courses[] = $flat;
                }
            }
        }

        return ['tracks' => $tracks, 'courses' => $courses];
    }

    /**
     * Génère un code faculté/département à partir du nom si vide.
     * Ex: "Faculté de Droit" -> "FD", "FABI" -> "FABI", "Faculté des Sciences" -> "FS"
     */
    public static function codeFromName(string $name, string $fallback = 'UNK'): string
    {
        $name = trim($name);
        if ($name === '') {
            return $fallback;
        }

        // Si nom est déjà un sigle court (<=6 majuscules sans espace), on le garde
        if (preg_match('/^[A-Z]{2,6}$/', $name)) {
            return strtoupper($name);
        }

        // Extrait les initiales des mots significatifs (translittère les accents :
        // "Génie Électrique" -> "GE", pas "G" ni "GENIE_").
        $words = preg_split('/\s+/', $name);
        $stop = ['de', 'des', 'du', 'la', 'le', 'et', 'en', 'l', 'd'];
        $code = '';
        foreach ($words as $w) {
            $ascii = Str::ascii(trim($w, " \t\n\r\0\x0B\"'’‘«»()[]-&"));
            if ($ascii === '') {
                continue;
            }
            $lower = strtolower($ascii);
            if (in_array($lower, $stop, true) || in_array(strtolower($w), $stop, true)) {
                continue;
            }
            $code .= strtoupper(substr($ascii, 0, 1));
        }

        $code = preg_replace('/[^A-Z]/', '', $code);
        if ($code === '' || strlen($code) < 2) {
            // fallback: slug uppercase, sans underscores pendants
            $code = strtoupper(Str::slug($name, '_'));
            $code = trim(preg_replace('/[^A-Z_]/', '', $code), '_');
            $code = substr($code, 0, 6);
            $code = trim($code, '_');
        }

        return $code !== '' ? $code : $fallback;
    }

    /**
     * Normalise le nom d'un département pour déduplication.
     * Ex: "Département de Chimie" -> "chimie", "Chimie" -> "chimie"
     */
    public static function normalizeDepartmentName(string $name): string
    {
        $n = mb_strtolower(trim($name));
        $n = preg_replace('/^département\s+(de\s+|d[\'’]\s*|des\s+|du\s+)?/u', '', $n);
        $n = preg_replace('/\s+/', ' ', $n);
        return trim($n);
    }

    /**
     * Mappe un numéro de semestre JSON (source de vérité) vers un niveau + semestre DB.
     * Lecture directe du JSON : jamais de semestre incorrect.
     * Règle dynamique : chaque niveau BAC a 2 semestres S1/S2, calculé depuis le JSON.
     * Ex: 1→BAC1/S1, 2→BAC1/S2, 3→BAC2/S1, 7→BAC4/S1 (Médecine), 10→BAC5/S2.
     * Ne hardcode pas 1..6, lit le JSON comme vérité.
     *
     * @return array{level_code: string, semester_code: string}
     */
    public static function mapSemesterToLevelSemester(int $semester): array
    {
        // Source de vérité: le JSON définit le semestre global du cours.
        // On calcule le niveau BAC correspondant dynamiquement: (semester-1)/2 +1
        // 1,2→BAC1, 3,4→BAC2, 5,6→BAC3, 7,8→BAC4, 9,10→BAC5, 11,12→BAC6
        $semester = max(1, $semester);
        // Pas de min(6) — on respecte le JSON jusqu'à 12
        if ($semester > 12) $semester = 12;

        $bacNumber = (int) ceil($semester / 2);
        $levelCode = 'BAC' . $bacNumber;
        // S1 pour impair, S2 pour pair
        $semesterCode = ($semester % 2 === 1) ? 'S1' : 'S2';

        // Vérifie que le niveau existe, sinon fallback sur M1/M2 pour anciens masters
        // Mais on privilégie BAC pour rester fidèle au JSON
        return [
            'level_code' => $levelCode,
            'semester_code' => $semesterCode,
        ];
    }

    /**
     * Retourne le numéro de semestre global depuis un niveau + semestre.
     * Inverse dynamique, sans hardcode 1..6.
     */
    public static function levelSemesterToGlobalSemester(string $levelCode, string $semesterCode): int
    {
        if (preg_match('/^BAC(\d+)$/', $levelCode, $m)) {
            $bac = (int) $m[1];
            $semInBac = ($semesterCode === 'S1') ? 1 : 2;
            return ($bac - 1) * 2 + $semInBac;
        }
        // Fallback pour M1/M2 (compatibilité)
        $map = [
            'M1' => ['S1' => 7, 'S2' => 8],
            'M2' => ['S1' => 9, 'S2' => 10],
        ];
        return $map[$levelCode][$semesterCode] ?? 1;
    }

    /**
     * Détermine la structure réelle des semestres pour une faculté depuis le JSON.
     * Retourne max semestre et niveaux réels (ex: Sciences→6→BAC1-3, Médecine→10→BAC1-5).
     *
     * @return array{max_semester: int, levels: list<string>, semesters: list<int>}
     */
    public static function facultySemesterStructure(string $facultyCode): array
    {
        $max = 6;
        foreach (static::loadAll() as $entry) {
            $facCode = $entry['faculty']['code'] ?? '';
            if (strtoupper($facCode) !== strtoupper($facultyCode)) continue;
            foreach ($entry['courses'] as $course) {
                $s = (int) ($course['semester'] ?? $course['semestre'] ?? 1);
                if (is_numeric($s)) $max = max($max, (int) $s);
            }
        }
        $levels = [];
        for ($i = 1; $i <= (int) ceil($max / 2); $i++) $levels[] = 'BAC' . $i;
        return [
            'max_semester' => $max,
            'levels' => $levels,
            'semesters' => range(1, $max),
        ];
    }
}
