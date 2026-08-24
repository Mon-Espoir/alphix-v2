<?php

namespace Database\Seeders;

use App\Models\Level;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds academic levels (Bac / Master).
 */
class LevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $levels = [
                [
                    'name' => 'Baccalauréat 1',
                    'code' => 'BAC1',
                    'slug' => 'bac-1',
                    'position' => 1,
                    'status' => true,
                ],
                [
                    'name' => 'Baccalauréat 2',
                    'code' => 'BAC2',
                    'slug' => 'bac-2',
                    'position' => 2,
                    'status' => true,
                ],
                [
                    'name' => 'Baccalauréat 3',
                    'code' => 'BAC3',
                    'slug' => 'bac-3',
                    'position' => 3,
                    'status' => true,
                ],
                [
                    'name' => 'Master 1',
                    'code' => 'M1',
                    'slug' => 'master-1',
                    'position' => 4,
                    'status' => true,
                ],
                [
                    'name' => 'Master 2',
                    'code' => 'M2',
                    'slug' => 'master-2',
                    'position' => 5,
                    'status' => true,
                ],
            ];

            foreach ($levels as $level) {
                Level::query()->updateOrCreate(
                    ['code' => $level['code']],
                    $level
                );
            }
        });
    }
}
