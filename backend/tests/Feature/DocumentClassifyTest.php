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
use Tests\TestCase;

class DocumentClassifyTest extends TestCase
{
    use RefreshDatabase;

    private function makeCourse(): Course
    {
        $faculty = Faculty::query()->create([
            'name' => 'Faculté des Sciences',
            'code' => 'FS',
            'slug' => 'sciences',
        ]);
        $department = Department::query()->create([
            'faculty_id' => $faculty->id,
            'name' => 'Département de Chimie',
            'code' => 'CHI',
            'slug' => 'chimie',
        ]);
        $level = Level::query()->create(['name' => 'Baccalauréat 3', 'code' => 'BAC3', 'slug' => 'bac-3']);
        $semester = Semester::query()->create(['name' => 'Semestre 1', 'code' => 'S1', 'slug' => 's1']);

        return Course::query()->create([
            'department_id' => $department->id,
            'level_id' => $level->id,
            'semester_id' => $semester->id,
            'name' => 'Chimie Hétérocyclique',
            'code' => 'CHI3616',
            'slug' => 'chi3616-heterocyclique',
        ]);
    }

    private function makeDocument(User $owner, array $overrides = []): Document
    {
        return Document::query()->create(array_merge([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'course_id' => null,
            'user_id' => $owner->id,
            'title' => 'Scan illisible',
            'original_name' => 'scan.jpg',
            'slug' => 'scan-'.uniqid(),
            'doc_type' => 'other',
            'file_hash' => hash('sha256', uniqid('', true)),
            'status' => 'pending',
        ], $overrides));
    }

    public function test_owner_can_classify_own_pending_document(): void
    {
        $owner = User::factory()->create(['role' => 'student']);
        $course = $this->makeCourse();
        $doc = $this->makeDocument($owner);

        $response = $this->actingAs($owner)->patchJson(
            "/api/v1/documents/{$doc->id}/classify",
            ['course_id' => $course->id, 'doc_type' => 'exam']
        );

        $response->assertOk();
        $this->assertSame($course->id, $response->json('data.course_id'));
        $this->assertSame('exam', $response->json('data.doc_type'));
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'course_id' => $course->id,
            'doc_type' => 'exam',
            'status' => 'pending',
        ]);
    }

    public function test_classify_rejects_unknown_course_and_type(): void
    {
        $owner = User::factory()->create(['role' => 'student']);
        $doc = $this->makeDocument($owner);

        $this->actingAs($owner)->patchJson(
            "/api/v1/documents/{$doc->id}/classify",
            ['course_id' => 999999, 'doc_type' => 'exam']
        )->assertStatus(422);

        $this->actingAs($owner)->patchJson(
            "/api/v1/documents/{$doc->id}/classify",
            ['course_id' => $this->makeCourse()->id, 'doc_type' => 'nope']
        )->assertStatus(422);
    }

    public function test_classify_refuses_approved_documents(): void
    {
        $owner = User::factory()->create(['role' => 'student']);
        $course = $this->makeCourse();
        $doc = $this->makeDocument($owner, ['status' => 'approved', 'course_id' => $course->id, 'doc_type' => 'exam']);

        $this->actingAs($owner)->patchJson(
            "/api/v1/documents/{$doc->id}/classify",
            ['course_id' => $course->id, 'doc_type' => 'tp']
        )->assertStatus(422);
    }

    public function test_stranger_cannot_classify_someone_elses_document(): void
    {
        $owner = User::factory()->create(['role' => 'student']);
        $stranger = User::factory()->create(['role' => 'student']);
        $course = $this->makeCourse();
        $doc = $this->makeDocument($owner);

        $this->actingAs($stranger)->patchJson(
            "/api/v1/documents/{$doc->id}/classify",
            ['course_id' => $course->id, 'doc_type' => 'tp']
        )->assertForbidden();
    }

    public function test_guest_cannot_classify(): void
    {
        $owner = User::factory()->create(['role' => 'student']);
        $course = $this->makeCourse();
        $doc = $this->makeDocument($owner);

        $this->patchJson(
            "/api/v1/documents/{$doc->id}/classify",
            ['course_id' => $course->id, 'doc_type' => 'tp']
        )->assertUnauthorized();
    }
}
