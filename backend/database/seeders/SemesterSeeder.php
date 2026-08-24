<?php

namespace Database\Seeders;

use App\Models\Semester;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds academic semesters.
 */
class SemesterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $semesters = [
                [
                    'name' => 'Semestre 1',
                    'code' => 'S1',
                    'slug' => 'semestre-1',
                    'position' => 1,
                    'status' => true,
                ],
                [
                    'name' => 'Semestre 2',
                    'code' => 'S2',
                    'slug' => 'semestre-2',
                    'position' => 2,
                    'status' => true,
                ],
            ];

            foreach ($semesters as $semester) {
                Semester::query()->updateOrCreate(
                    ['code' => $semester['code']],
                    $semester
                );
            }
        });
    }
}
