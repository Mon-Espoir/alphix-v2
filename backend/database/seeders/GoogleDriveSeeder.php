<?php

namespace Database\Seeders;

use App\Models\GoogleDrive;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeds Google Drive storage accounts used by ALPHIX.
 */
class GoogleDriveSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $drives = [
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Drive Sciences',
                    'code' => 'DRV_SC',
                    'folder_id' => 'gdrive-folder-sciences-001',
                    'email' => 'alphix.sciences@university.local',
                    'type' => 'shared_drive',
                    'storage_limit' => 1099511627776,
                    'used_storage' => 0,
                    'available_storage' => 1099511627776,
                    'priority' => 1,
                    'health_status' => 'healthy',
                    'upload_count' => 0,
                    'is_default' => true,
                    'status' => true,
                    'notes' => 'Default drive for the Faculty of Sciences.',
                ],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Drive Médecine',
                    'code' => 'DRV_MED',
                    'folder_id' => 'gdrive-folder-medecine-001',
                    'email' => 'alphix.medecine@university.local',
                    'type' => 'shared_drive',
                    'storage_limit' => 1099511627776,
                    'used_storage' => 0,
                    'available_storage' => 1099511627776,
                    'priority' => 2,
                    'health_status' => 'healthy',
                    'upload_count' => 0,
                    'is_default' => false,
                    'status' => true,
                    'notes' => 'Drive for the Faculty of Medicine.',
                ],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Drive Droit',
                    'code' => 'DRV_DROIT',
                    'folder_id' => 'gdrive-folder-droit-001',
                    'email' => 'alphix.droit@university.local',
                    'type' => 'shared_drive',
                    'storage_limit' => 549755813888,
                    'used_storage' => 0,
                    'available_storage' => 549755813888,
                    'priority' => 3,
                    'health_status' => 'healthy',
                    'upload_count' => 0,
                    'is_default' => false,
                    'status' => true,
                    'notes' => 'Drive for the Faculty of Law.',
                ],
            ];

            foreach ($drives as $drive) {
                GoogleDrive::query()->firstOrCreate(
                    ['code' => $drive['code']],
                    $drive
                );
            }
        });
    }
}
