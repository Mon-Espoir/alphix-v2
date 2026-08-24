<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Execution order respects Foreign Key dependencies:
     * GoogleDrive → Faculty → Department → Level / Semester → Course
     * DocumentTag is independent and can run last.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->call([
                GoogleDriveSeeder::class,
                FacultySeeder::class,
                DepartmentSeeder::class,
                LevelSeeder::class,
                SemesterSeeder::class,
                CourseSeeder::class,
                DocumentTagSeeder::class,
            ]);
        });
    }
}
