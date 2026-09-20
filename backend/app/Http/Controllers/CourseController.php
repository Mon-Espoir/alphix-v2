<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use App\Services\CourseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CourseController extends Controller
{
    public function __construct(
        protected CourseService $courseService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $courses = $this->courseService->allWithDocumentCounts();

        return CourseResource::collection($courses);
    }

    public function search(Request $request): AnonymousResourceCollection
    {
        $term = trim((string) $request->query('q', $request->query('query', '')));
        if ($term === '') {
            return CourseResource::collection(collect([]));
        }

        $courses = $this->courseService->searchWithDocumentCounts($term);

        // Fallback tolérant (accents, fautes, acronymes) si 0 résultat
        if ($courses->isEmpty()) {
            try {
                $fuzzy = app(\App\Repositories\CourseRepository::class)->searchWithDocumentCountsFuzzy($term);
                if ($fuzzy->isNotEmpty()) {
                    return CourseResource::collection($fuzzy)->additional(['fallback' => 'fuzzy']);
                }
            } catch (\Throwable $e) { report($e); }
            // Dernier filet : IA Gemini si configurée (suggestions invisibles, on rejoue avec alias)
            try {
                $ai = app(\App\Services\SecondaryAIService::class);
                $suggestions = $ai->suggest($term, ['total_results' => 0]);
                if ($suggestions !== [] && isset($suggestions[0]['label'])) {
                    $alias = trim((string) $suggestions[0]['label']);
                    if ($alias !== '' && mb_strtolower($alias) !== mb_strtolower($term)) {
                        $aliasCourses = $this->courseService->searchWithDocumentCounts($alias);
                        if ($aliasCourses->isNotEmpty()) {
                            return CourseResource::collection($aliasCourses)->additional(['fallback' => 'ai', 'ai_suggestions' => $suggestions]);
                        }
                    }
                }
            } catch (\Throwable $e) { report($e); }
        }

        return CourseResource::collection($courses);
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $validated = $request->validated();

        Gate::authorize('createInDepartment', [
            Course::class,
            (int) ($validated['department_id'] ?? 0),
            isset($validated['level_id']) ? (int) $validated['level_id'] : null,
        ]);

        $course = $this->courseService->create($validated);

        return (new CourseResource($course))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): CourseResource
    {
        $course = $this->courseService->find($id);

        return new CourseResource($course->loadCount('documents')->load(['department.faculty', 'level', 'semester']));
    }

    public function update(UpdateCourseRequest $request, int $id): CourseResource
    {
        $existing = $this->courseService->find($id);

        Gate::authorize('update', $existing);

        // Anti-evasion : un delegue ne peut pas deplacer un cours hors de
        // son perimetre (departement + classe) via les champs valides.
        $user = $request->user();
        if ($user !== null && ! $this->isAdminUser($user)) {
            $validated = $request->validated();
            $effectiveDept = isset($validated['department_id']) ? (int) $validated['department_id'] : (int) $existing->department_id;
            $effectiveLevel = isset($validated['level_id']) ? (int) $validated['level_id'] : (int) $existing->level_id;
            Gate::authorize('createInDepartment', [Course::class, $effectiveDept, $effectiveLevel]);
        }

        $course = $this->courseService->update($id, $request->validated());

        return new CourseResource($course);
    }

    /**
     * Roles d'administration (miroir des policies).
     */
    private function isAdminUser(\App\Models\User $user): bool
    {
        return in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true);
    }

    public function destroy(int $id): JsonResponse
    {
        Gate::authorize('delete', $this->courseService->find($id));

        $this->courseService->delete($id);

        return response()->json(null, 204);
    }

    public function byDepartment(int $departmentId): AnonymousResourceCollection
    {
        $courses = $this->courseService->byDepartment($departmentId);

        return CourseResource::collection($courses);
    }

    public function bySemester(int $semesterId): AnonymousResourceCollection
    {
        $courses = $this->courseService->bySemester($semesterId);

        return CourseResource::collection($courses);
    }

    public function byLevel(int $levelId): AnonymousResourceCollection
    {
        $courses = $this->courseService->byLevel($levelId);

        return CourseResource::collection($courses);
    }
}
