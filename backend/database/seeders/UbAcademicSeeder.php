<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Level;
use App\Models\Semester;
use App\Services\AcademicRegistry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Seeder officiel UB (Single Source of Truth JSON)
 * ---------------------------------------------------------------------------
 * Lit automatiquement tous les JSON de ub_departements_json/ et alimente
 * la hiérarchie Faculty → Department → (Track →) Course.
 *
 * - Ne modifie jamais les JSON (lecture seule)
 * - Ne recrée pas les JSON, ne corrige pas leurs données
 * - Idempotent (updateOrCreate par code/slug)
 * - Respecte les FK: Faculty → Department → Level/Semester → Course
 * - Gère les tracks comme sous-départements (réutilise table departments)
 * - Mappe semestre 1..6 vers Level BAC1-3 + Semester S1/S2
 */
class UbAcademicSeeder extends Seeder
{
    public function run(): void
    {
        $entries = AcademicRegistry::loadAll();

        if (empty($entries)) {
            $this->command?->warn('UbAcademicSeeder: aucun JSON trouvé dans ' . AcademicRegistry::sourcePath());
            return;
        }

        DB::transaction(function () use ($entries): void {
            // Assure que les niveaux/semestres de base existent (même si LevelSeeder déjà passé)
            $this->ensureBaseLevelsAndSemesters();

            foreach ($entries as $entry) {
                $facultyData = $entry['faculty'];
                $departmentData = $entry['department'];
                $tracks = $entry['tracks'];
                $courses = $entry['courses'];

                // Géologie.json vide déjà filtré, mais garde-fou
                if (empty($facultyData) && empty($departmentData)) {
                    continue;
                }

                // --- Faculty ---
                $faculty = $this->upsertFaculty($facultyData);

                if (! $faculty) {
                    continue;
                }

                // --- Tracks comme sous-départements ---
                // Map track code -> department id
                $trackDepartmentMap = [];

                if (is_array($tracks) && count($tracks) > 0) {
                    foreach ($tracks as $track) {
                        $code = trim($track['code'] ?? '');
                        $name = trim($track['name'] ?? '');

                        if ($code === '' && $name === '') {
                            continue;
                        }

                        if ($code === '') {
                            $code = AcademicRegistry::codeFromName($name, 'TRK');
                        }

                        // Code unique de sous-département: {baseDeptCode}_{trackCode} si base existe
                        $baseDeptCode = trim($departmentData['code'] ?? '');
                        if ($baseDeptCode === '') {
                            $baseDeptCode = AcademicRegistry::codeFromName($departmentData['name'] ?? 'DEPT', 'DEPT');
                        }
                        $deptCode = strtoupper($baseDeptCode . '_' . $code);
                        $deptCode = substr($deptCode, 0, 30);

                        $slug = Str::slug($name !== '' ? $name : $code);
                        // Préfixe par base pour unicité
                        $slug = Str::slug($baseDeptCode . '-' . $slug);
                        $slug = substr($slug, 0, 100);

                        // Recherche par code (unique) — crée département track
                        $trackDept = Department::query()->updateOrCreate(
                            ['code' => $deptCode],
                            [
                                'faculty_id' => $faculty->id,
                                'name' => $name !== '' ? $name : $code,
                                'slug' => $slug,
                                'short_name' => $code,
                                'description' => 'Filière/Option ' . ($name !== '' ? $name : $code),
                                'status' => true,
                                'is_public' => true,
                            ]
                        );

                        $trackDepartmentMap[$code] = $trackDept->id;
                        // Aussi mapper sans underscore pour tolérance
                        $trackDepartmentMap[trim($track['code'] ?? '')] = $trackDept->id;
                        // Les JSON plats renseignent parfois le NOM de la filière dans
                        // course.track (ex: "Finance et Comptabilité" au lieu de "FIC").
                        // On mappe donc aussi par nom exact + insensible à la casse,
                        // afin que ces cours rejoignent leur sous-département au lieu
                        // de retomber sur le département principal.
                        if ($name !== '') {
                            $trackDepartmentMap[$name] = $trackDept->id;
                            $trackDepartmentMap[mb_strtolower($name)] = $trackDept->id;
                            $trackDepartmentMap[mb_strtolower($code)] = $trackDept->id;
                        }
                    }
                }

                // --- Département principal ---
                $department = $this->upsertDepartment($departmentData, $faculty->id);

                if (! $department) {
                    continue;
                }

                // --- Courses ---
                // IDs des départements de cette entrée (principal + filières) :
                // une réassignation AU SEIN de la même entrée (ex: commun -> filière
                // après correction du mapping nom/code) est légitime et autorisée.
                // Seuls les conflits ENTRE entrées (autres fichiers/départements)
                // restent protégés (premier fichier propriétaire).
                $entryDepartmentIds = array_values(array_unique(array_merge(
                    [$department->id],
                    array_values($trackDepartmentMap)
                )));
                foreach ($courses as $course) {
                    $this->upsertCourse($course, $department, $trackDepartmentMap, $entryDepartmentIds);
                }
            }
        });

        $this->command?->info('UbAcademicSeeder: ' . count($entries) . ' fichiers traités.');
    }

    private function ensureBaseLevelsAndSemesters(): void
    {
        // Levels BAC1-6, M1-2 déjà seedés, mais assure existence
        // (BAC4-6 requis par Médecine semestres 7-10 et FSI semestres 7-8).
        $levels = [
            ['code' => 'BAC1', 'name' => 'Baccalauréat 1', 'slug' => 'bac-1', 'position' => 1],
            ['code' => 'BAC2', 'name' => 'Baccalauréat 2', 'slug' => 'bac-2', 'position' => 2],
            ['code' => 'BAC3', 'name' => 'Baccalauréat 3', 'slug' => 'bac-3', 'position' => 3],
            ['code' => 'BAC4', 'name' => 'Baccalauréat 4', 'slug' => 'bac-4', 'position' => 4],
            ['code' => 'BAC5', 'name' => 'Baccalauréat 5', 'slug' => 'bac-5', 'position' => 5],
            ['code' => 'BAC6', 'name' => 'Baccalauréat 6', 'slug' => 'bac-6', 'position' => 6],
            ['code' => 'M1', 'name' => 'Master 1', 'slug' => 'master-1', 'position' => 7],
            ['code' => 'M2', 'name' => 'Master 2', 'slug' => 'master-2', 'position' => 8],
        ];

        foreach ($levels as $lvl) {
            Level::query()->updateOrCreate(['code' => $lvl['code']], array_merge($lvl, ['status' => true]));
        }

        $semesters = [
            ['code' => 'S1', 'name' => 'Semestre 1', 'slug' => 'semestre-1', 'position' => 1],
            ['code' => 'S2', 'name' => 'Semestre 2', 'slug' => 'semestre-2', 'position' => 2],
        ];

        foreach ($semesters as $sem) {
            Semester::query()->updateOrCreate(['code' => $sem['code']], array_merge($sem, ['status' => true]));
        }
    }

    private function upsertFaculty(?array $data): ?Faculty
    {
        if (empty($data) || empty($data['name'])) {
            return null;
        }

        $code = trim($data['code'] ?? '');
        $name = trim($data['name'] ?? '');

        if ($name === '') {
            return null;
        }

        if ($code === '') {
            $code = AcademicRegistry::codeFromName($name, 'FAC');
        }

        $code = strtoupper(substr($code, 0, 30));
        $slug = Str::slug($name);
        // Si faculté déjà existante avec même code (FS), on ne duplique pas
        $faculty = Faculty::query()->where('code', $code)->first();

        if ($faculty) {
            // Met à jour le nom si plus complet (ex: FABI -> Faculté d'Agronomie...)
            // Mais ne casse pas les existants
            return $faculty;
        }

        // Recherche aussi par slug au cas où code généré diffère mais nom identique
        $facultyBySlug = Faculty::query()->where('slug', $slug)->first();
        if ($facultyBySlug) {
            return $facultyBySlug;
        }

        return Faculty::query()->updateOrCreate(
            ['code' => $code],
            [
                'name' => $name,
                'slug' => $slug,
                'description' => null,
                'status' => true,
            ]
        );
    }

    private function upsertDepartment(?array $data, int $facultyId): ?Department
    {
        if (empty($data) || empty($data['name'])) {
            return null;
        }

        $code = trim($data['code'] ?? '');
        $name = trim($data['name'] ?? '');

        if ($code === '') {
            $code = AcademicRegistry::codeFromName($name, 'DEPT');
        }

        $code = strtoupper(substr($code, 0, 30));
        $slug = Str::slug($name);
        $slug = substr($slug, 0, 100);

        // Déduplication par nom normalisé (ex: "Chimie" == "Département de Chimie") pour éviter doublons CHM/CHI
        $normalized = AcademicRegistry::normalizeDepartmentName($name);
        $existingByName = Department::query()->where('faculty_id', $facultyId)->get()->first(function ($dept) use ($normalized) {
            return AcademicRegistry::normalizeDepartmentName($dept->name) === $normalized;
        });
        if ($existingByName) {
            return $existingByName;
        }

        // Si département code déjà existe, on le retourne (idempotent)
        $existing = Department::query()->where('code', $code)->first();
        if ($existing) {
            // Assure la faculté est correcte si manquante
            return $existing;
        }

        // Aussi par slug + faculty_id
        $bySlug = Department::query()->where('slug', $slug)->where('faculty_id', $facultyId)->first();
        if ($bySlug) {
            return $bySlug;
        }

        return Department::query()->updateOrCreate(
            ['code' => $code],
            [
                'faculty_id' => $facultyId,
                'name' => $name,
                'slug' => $slug,
                'short_name' => $code,
                'description' => null,
                'status' => true,
                'is_public' => true,
            ]
        );
    }

    private function upsertCourse(array $course, Department $defaultDepartment, array $trackMap, array $entryDepartmentIds = []): void
    {
        $code = trim($course['code'] ?? '');
        $name = trim($course['name'] ?? '');

        if ($code === '' || $name === '') {
            return;
        }

        $code = strtoupper(substr($code, 0, 50));
        $slug = Str::slug($code . '-' . $name);
        $slug = substr($slug, 0, 255);

        // Détermine le département cible (track si présent).
        // Tolère code OU nom de filière, sensible puis insensible à la casse
        // (les JSON plats mélangent les deux conventions).
        $targetDepartmentId = $defaultDepartment->id;
        $track = trim($course['track'] ?? '');
        if ($track !== '') {
            if (isset($trackMap[$track])) {
                $targetDepartmentId = $trackMap[$track];
            } elseif (isset($trackMap[mb_strtolower($track)])) {
                $targetDepartmentId = $trackMap[mb_strtolower($track)];
            }
        }

        // Mapping semestre -> level/semester
        $semesterNum = (int) ($course['semester'] ?? $course['semestre'] ?? 1);
        $map = AcademicRegistry::mapSemesterToLevelSemester($semesterNum);

        $levelId = Level::query()->where('code', $map['level_code'])->value('id');
        $semesterId = Semester::query()->where('code', $map['semester_code'])->value('id');

        if (! $levelId || ! $semesterId) {
            return;
        }

        $credits = isset($course['credits']) ? (int) $course['credits'] : null;
        $hours = isset($course['hours']) ? (int) $course['hours'] : null;

        // Upsert par code (unique). Conflit INTER-entrées : le premier
        // fichier (ordre alphabétique du glob) est propriétaire ; les écritures
        // suivantes portant le même code pour un autre département sont
        // ignorées afin de ne jamais corrompre la Source de Vérité.
        // En revanche, une réassignation AU SEIN de la même entrée
        // (principal <-> ses filières) est légitime (correction du mapping
        // nom/code) et appliquée via update.
        $existing = Course::query()->where('code', $code)->first();

        if ($existing && (int) $existing->department_id !== (int) $targetDepartmentId) {
            $isSameEntry = ! empty($entryDepartmentIds)
                && in_array((int) $existing->department_id, array_map('intval', $entryDepartmentIds), true);

            if (! $isSameEntry) {
                if ($this->command) {
                    $this->command->warn(
                        "UbAcademicSeeder: code {$code} déjà rattaché au département #{$existing->department_id}"
                        ." — écriture depuis {$defaultDepartment->code} ignorée (conflit inter-départements)."
                    );
                }

                return;
            }
        }

        Course::query()->updateOrCreate(
            ['code' => $code],
            [
                'department_id' => $targetDepartmentId,
                'level_id' => $levelId,
                'semester_id' => $semesterId,
                'name' => $name,
                'slug' => $slug,
                'description' => null,
                'credits' => $credits,
                'hours' => $hours,
                'status' => true,
            ]
        );
    }
}
