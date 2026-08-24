<?php

namespace Database\Seeders;

use App\Models\Faculty;
use App\Models\GoogleDrive;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds academic faculties.
 */
class FacultySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $sciencesDriveId = GoogleDrive::query()->where('code', 'DRV_SC')->value('id');
            $medecineDriveId = GoogleDrive::query()->where('code', 'DRV_MED')->value('id');
            $droitDriveId = GoogleDrive::query()->where('code', 'DRV_DROIT')->value('id');

            $faculties = [
                [
                    'name' => 'Faculté des Sciences',
                    'code' => 'FS',
                    'slug' => 'sciences',
                    'description' => 'Faculté des Sciences exactes et naturelles.',
                    'color' => '#1E88E5',
                    'icon' => 'science',
                    'drive_id' => $sciencesDriveId,
                    'status' => true,
                ],
                [
                    'name' => 'Faculté de Médecine',
                    'code' => 'FM',
                    'slug' => 'medecine',
                    'description' => 'Faculté de Médecine et sciences de la santé.',
                    'color' => '#E53935',
                    'icon' => 'medical',
                    'drive_id' => $medecineDriveId,
                    'status' => true,
                ],
                [
                    'name' => 'Faculté de Droit',
                    'code' => 'FD',
                    'slug' => 'droit',
                    'description' => 'Faculté de Droit et sciences politiques.',
                    'color' => '#6D4C41',
                    'icon' => 'law',
                    'drive_id' => $droitDriveId,
                    'status' => true,
                ],
            ];

            foreach ($faculties as $faculty) {
                Faculty::query()->updateOrCreate(
                    ['code' => $faculty['code']],
                    $faculty
                );
            }
        });
    }
}
