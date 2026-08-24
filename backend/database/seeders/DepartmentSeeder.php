<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Faculty;
use App\Models\GoogleDrive;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds academic departments linked to faculties.
 */
class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $sciencesId = Faculty::query()->where('code', 'FS')->value('id');
            $medecineId = Faculty::query()->where('code', 'FM')->value('id');
            $droitId = Faculty::query()->where('code', 'FD')->value('id');

            $sciencesDriveId = GoogleDrive::query()->where('code', 'DRV_SC')->value('id');
            $medecineDriveId = GoogleDrive::query()->where('code', 'DRV_MED')->value('id');
            $droitDriveId = GoogleDrive::query()->where('code', 'DRV_DROIT')->value('id');

            $departments = [
                [
                    'faculty_id' => $sciencesId,
                    'name' => 'Chimie',
                    'code' => 'CHM',
                    'slug' => 'chimie',
                    'short_name' => 'Chimie',
                    'description' => 'Département de Chimie.',
                    'color' => '#43A047',
                    'icon' => 'chemistry',
                    'drive_id' => $sciencesDriveId,
                    'is_public' => true,
                    'status' => true,
                ],
                [
                    'faculty_id' => $sciencesId,
                    'name' => 'Informatique',
                    'code' => 'INF',
                    'slug' => 'informatique',
                    'short_name' => 'Info',
                    'description' => 'Département d\'Informatique.',
                    'color' => '#039BE5',
                    'icon' => 'computer',
                    'drive_id' => $sciencesDriveId,
                    'is_public' => true,
                    'status' => true,
                ],
                [
                    'faculty_id' => $sciencesId,
                    'name' => 'Biologie',
                    'code' => 'BIO',
                    'slug' => 'biologie',
                    'short_name' => 'Bio',
                    'description' => 'Département de Biologie.',
                    'color' => '#7CB342',
                    'icon' => 'biology',
                    'drive_id' => $sciencesDriveId,
                    'is_public' => true,
                    'status' => true,
                ],
                [
                    'faculty_id' => $medecineId,
                    'name' => 'Médecine Générale',
                    'code' => 'MED',
                    'slug' => 'medecine-generale',
                    'short_name' => 'Médecine',
                    'description' => 'Département de Médecine Générale.',
                    'color' => '#D32F2F',
                    'icon' => 'hospital',
                    'drive_id' => $medecineDriveId,
                    'is_public' => true,
                    'status' => true,
                ],
                [
                    'faculty_id' => $droitId,
                    'name' => 'Droit Privé',
                    'code' => 'DRP',
                    'slug' => 'droit-prive',
                    'short_name' => 'Droit Privé',
                    'description' => 'Département de Droit Privé.',
                    'color' => '#5D4037',
                    'icon' => 'balance',
                    'drive_id' => $droitDriveId,
                    'is_public' => true,
                    'status' => true,
                ],
            ];

            foreach ($departments as $department) {
                Department::query()->updateOrCreate(
                    ['code' => $department['code']],
                    $department
                );
            }
        });
    }
}
