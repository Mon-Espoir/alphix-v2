<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Department;
use App\Models\GoogleDrive;
use App\Models\Level;
use App\Models\Semester;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds example academic courses.
 */
class CourseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $chimieId = Department::query()->where('code', 'CHI')->value('id') ?? Department::query()->where('code', 'CHM')->value('id');
            $informatiqueId = Department::query()->where('code', 'INF')->value('id');
            $biologieId = Department::query()->where('code', 'BIO')->value('id');

            $bac1Id = Level::query()->where('code', 'BAC1')->value('id');
            $bac2Id = Level::query()->where('code', 'BAC2')->value('id');
            $bac3Id = Level::query()->where('code', 'BAC3')->value('id');

            $s1Id = Semester::query()->where('code', 'S1')->value('id');
            $s2Id = Semester::query()->where('code', 'S2')->value('id');

            $sciencesDriveId = GoogleDrive::query()->where('code', 'DRV_SC')->value('id');

            $courses = [
                [
                    'department_id' => $chimieId,
                    'level_id' => $bac3Id,
                    'semester_id' => $s1Id,
                    'name' => 'Chimie Organique III',
                    'code' => 'CHI3509',
                    'slug' => 'chimie-organique-iii',
                    'description' => 'Cours avancé de chimie organique.',
                    'credits' => 5,
                    'coefficient' => 2.00,
                    'hours' => 45,
                    'teacher' => 'Dr. Nkurunziza',
                    'color' => '#43A047',
                    'icon' => 'flask',
                    'drive_id' => $sciencesDriveId,
                    'status' => true,
                ],
                [
                    'department_id' => $informatiqueId,
                    'level_id' => $bac2Id,
                    'semester_id' => $s1Id,
                    'name' => 'Structures de Données',
                    'code' => 'INF2201',
                    'slug' => 'structures-de-donnees',
                    'description' => 'Algorithmes et structures de données fondamentales.',
                    'credits' => 4,
                    'coefficient' => 1.50,
                    'hours' => 40,
                    'teacher' => 'Prof. Habimana',
                    'color' => '#039BE5',
                    'icon' => 'code',
                    'drive_id' => $sciencesDriveId,
                    'status' => true,
                ],
                [
                    'department_id' => $informatiqueId,
                    'level_id' => $bac1Id,
                    'semester_id' => $s2Id,
                    'name' => 'Introduction à la Programmation',
                    'code' => 'INF1102',
                    'slug' => 'introduction-programmation',
                    'description' => 'Bases de la programmation impérative.',
                    'credits' => 4,
                    'coefficient' => 1.50,
                    'hours' => 36,
                    'teacher' => 'Assist. Uwimana',
                    'color' => '#0288D1',
                    'icon' => 'terminal',
                    'drive_id' => $sciencesDriveId,
                    'status' => true,
                ],
                [
                    'department_id' => $biologieId,
                    'level_id' => $bac2Id,
                    'semester_id' => $s2Id,
                    'name' => 'Génétique Générale',
                    'code' => 'BIO2304',
                    'slug' => 'genetique-generale',
                    'description' => 'Principes de génétique mendélienne et moléculaire.',
                    'credits' => 3,
                    'coefficient' => 1.00,
                    'hours' => 30,
                    'teacher' => 'Dr. Mukamana',
                    'color' => '#7CB342',
                    'icon' => 'dna',
                    'drive_id' => $sciencesDriveId,
                    'status' => true,
                ],
            ];

            foreach ($courses as $course) {
                Course::query()->updateOrCreate(
                    ['code' => $course['code']],
                    $course
                );
            }
        });
    }
}
