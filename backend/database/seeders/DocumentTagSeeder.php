<?php

namespace Database\Seeders;

use App\Models\DocumentTag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds document classification tags.
 */
class DocumentTagSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $tags = [
                [
                    'name' => 'Examen',
                    'slug' => 'examen',
                    'description' => 'Sujets d\'examen.',
                    'color' => '#E53935',
                ],
                [
                    'name' => 'Correction',
                    'slug' => 'correction',
                    'description' => 'Corrigés d\'examens ou de travaux.',
                    'color' => '#43A047',
                ],
                [
                    'name' => 'TP',
                    'slug' => 'tp',
                    'description' => 'Travaux pratiques.',
                    'color' => '#FB8C00',
                ],
                [
                    'name' => 'TD',
                    'slug' => 'td',
                    'description' => 'Travaux dirigés.',
                    'color' => '#FDD835',
                ],
                [
                    'name' => 'Syllabus',
                    'slug' => 'syllabus',
                    'description' => 'Plans de cours et syllabi.',
                    'color' => '#1E88E5',
                ],
                [
                    'name' => 'Résumé',
                    'slug' => 'resume',
                    'description' => 'Résumés et fiches de révision.',
                    'color' => '#8E24AA',
                ],
                [
                    'name' => 'Cours',
                    'slug' => 'cours',
                    'description' => 'Supports de cours magistraux.',
                    'color' => '#3949AB',
                ],
                [
                    'name' => 'Année académique',
                    'slug' => 'annee-academique',
                    'description' => 'Documents liés à une année académique spécifique.',
                    'color' => '#546E7A',
                ],
            ];

            foreach ($tags as $tag) {
                DocumentTag::query()->updateOrCreate(
                    ['slug' => $tag['slug']],
                    $tag
                );
            }
        });
    }
}
