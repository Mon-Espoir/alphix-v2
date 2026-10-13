<?php

namespace App\Http\Controllers;

use App\Models\Faculty;
use Illuminate\Http\JsonResponse;

/**
 * Explorateur en cascade : Faculte -> Departement -> Classe -> Cours.
 *
 * UNE seule requete construit tout l'arbre, branches vides ELAGUEES :
 * l'application ne peut jamais afficher "aucun cours trouve" car chaque
 * niveau ne propose que des choix qui menent a du contenu.
 *   - faculte listee ssi >= 1 departement avec >= 1 cours ;
 *   - departement liste ssi >= 1 cours dans >= 1 classe ;
 *   - classe listee ssi >= 1 cours (dept + classe) ;
 *   - cours tries par nombre de documents (les plus fournis d'abord).
 * Les documents eux-memes restent charges a la demande par cours
 * (GET /documents?course_id=X) pour garder la reponse legere.
 */
class ExplorerController extends Controller
{
    public function index(): JsonResponse
    {
        $faculties = Faculty::query()
            ->with(['departments.courses' => function ($q): void {
                $q->withCount(['documents as documents_count' => function ($q): void {
                    $q->where('status', 'approved');
                }])->with('level:id,code,name');
            }])
            ->orderBy('name')
            ->get();

        $tree = [];
        foreach ($faculties as $faculty) {
            $deptNodes = [];
            $facultyDocs = 0;
            foreach ($faculty->departments as $department) {
                if ($department->courses->isEmpty()) {
                    continue;
                }
                // Regroupe les cours par classe (niveau), "Général" si sans niveau.
                $byLevel = [];
                foreach ($department->courses as $course) {
                    $level = $course->level;
                    $key = $level?->id ?? 0;
                    if (! isset($byLevel[$key])) {
                        $byLevel[$key] = [
                            'id' => $level?->id,
                            'code' => $level?->code ?? 'GEN',
                            'name' => $level?->name ?? 'Général',
                            'courses' => [],
                            'documents' => 0,
                        ];
                    }
                    $docs = (int) ($course->documents_count ?? 0);
                    $byLevel[$key]['courses'][] = [
                        'id' => $course->id,
                        'code' => $course->code,
                        'title' => $course->title ?? $course->name,
                        'documents' => $docs,
                    ];
                    $byLevel[$key]['documents'] += $docs;
                }
                // Cours les plus fournis d'abord (l'etudiant trouve vite).
                $levels = array_values($byLevel);
                foreach ($levels as &$lvl) {
                    usort($lvl['courses'], fn ($a, $b) => $b['documents'] <=> $a['documents']);
                }
                unset($lvl);
                usort($levels, fn ($a, $b) => $b['documents'] <=> $a['documents']);

                $deptDocs = array_sum(array_column($levels, 'documents'));
                $deptNodes[] = [
                    'id' => $department->id,
                    'name' => $department->name,
                    'code' => $department->code,
                    'courses' => $department->courses->count(),
                    'documents' => $deptDocs,
                    'levels' => $levels,
                ];
                $facultyDocs += $deptDocs;
            }
            if ($deptNodes === []) {
                continue;
            }
            usort($deptNodes, fn ($a, $b) => $b['documents'] <=> $a['documents']);
            $tree[] = [
                'id' => $faculty->id,
                'name' => $faculty->name,
                'departments' => count($deptNodes),
                'documents' => $facultyDocs,
                'children' => $deptNodes,
            ];
        }

        return response()->json(['data' => $tree]);
    }
}
