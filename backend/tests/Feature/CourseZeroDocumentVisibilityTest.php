<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Document;
use App\Models\Faculty;
use App\Models\Level;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Garantit que les cours SANS document restent visibles partout
 * (recherche, liste, filtres département/niveau) avec leur enseignant.
 */
class CourseZeroDocumentVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private Course $withDocs;

    private Course $withoutDocs;

    protected function setUp(): void
    {
        parent::setUp();

        $faculty = Faculty::query()->create(['name' => 'Faculté des Sciences', 'code' => 'FS', 'slug' => 'fs']);
        $department = Department::query()->create([
            'faculty_id' => $faculty->id, 'name' => 'Département de Chimie', 'code' => 'CHI', 'slug' => 'chi',
        ]);
        $level = Level::query()->create(['name' => 'Baccalauréat 3', 'code' => 'BAC3', 'slug' => 'bac-3']);
        $semester = Semester::query()->create(['name' => 'Semestre 2', 'code' => 'S2', 'slug' => 's2']);

        $base = [
            'department_id' => $department->id,
            'level_id' => $level->id,
            'semester_id' => $semester->id,
        ];

        $this->withDocs = Course::query()->create($base + [
            'name' => 'Chimie hétérocyclique', 'code' => 'CHI3616',
            'slug' => 'chi3616', 'teacher' => 'Liberata NIZIGIYIMANA',
        ]);
        $this->withoutDocs = Course::query()->create($base + [
            'name' => 'Projet personnel et déroulement', 'code' => 'CHI3618',
            'slug' => 'chi3618', 'teacher' => 'Steve Juru De Cliff',
        ]);

        $owner = User::factory()->create();
        Document::query()->create([
            'uuid' => (string) Str::uuid(),
            'course_id' => $this->withDocs->id,
            'user_id' => $owner->id,
            'title' => 'Examen test',
            'original_name' => 'examen.pdf',
            'slug' => 'examen-test-'.uniqid(),
            'doc_type' => 'exam',
            'file_hash' => hash('sha256', uniqid('', true)),
            'status' => 'approved',
        ]);
    }

    public function test_index_lists_courses_without_documents(): void
    {
        $codes = collect($this->getJson('/api/v1/courses')->json('data'))->pluck('code')->all();

        $this->assertContains('CHI3616', $codes);
        $this->assertContains('CHI3618', $codes);
    }

    public function test_search_returns_courses_without_documents(): void
    {
        $response = $this->getJson('/api/v1/courses/search?q=projet%20personnel');

        $response->assertOk();
        $codes = collect($response->json('data'))->pluck('code')->all();
        $this->assertContains('CHI3618', $codes);
    }

    public function test_department_and_level_scopes_include_empty_courses(): void
    {
        $deptId = $this->withoutDocs->department_id;
        $levelId = $this->withoutDocs->level_id;

        $byDept = collect($this->getJson("/api/v1/departments/{$deptId}/courses")->json('data'))
            ->pluck('code')->all();
        $this->assertContains('CHI3618', $byDept);

        $byLevel = collect($this->getJson("/api/v1/levels/{$levelId}/courses")->json('data'))
            ->pluck('code')->all();
        $this->assertContains('CHI3618', $byLevel);
    }

    public function test_empty_course_exposes_teacher_and_zero_count(): void
    {
        $response = $this->getJson("/api/v1/courses/{$this->withoutDocs->id}");

        $response->assertOk();
        $this->assertSame('Steve Juru De Cliff', $response->json('data.teacher'));
        $this->assertSame(0, (int) $response->json('data.documents_count'));
    }
}
