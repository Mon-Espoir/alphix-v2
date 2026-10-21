<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentTag;
use App\Models\Faculty;
use App\Models\Level;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Filtres serveur de `GET /api/v1/search`.
 *
 * Le frontend envoie désormais les facettes (type, visibilité, tag, dates,
 * compteurs) au serveur au lieu de filtrer 100 documents côté client.
 * Ce test verrouille ce contrat : un filtre non transmis ou non appliqué
 * produirait des résultats FAUX en silence.
 */
class DocumentSearchFiltersTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private DocumentTag $tag;

    private Document $exam;

    private Document $tp;

    protected function setUp(): void
    {
        parent::setUp();

        $faculty = Faculty::query()->create(['name' => 'Faculté des Sciences', 'code' => 'FS', 'slug' => 'fs']);
        $department = Department::query()->create([
            'faculty_id' => $faculty->id, 'name' => 'Département de Chimie', 'code' => 'CHI', 'slug' => 'chi',
        ]);
        $level = Level::query()->create(['name' => 'Baccalauréat 3', 'code' => 'BAC3', 'slug' => 'bac-3']);
        $semester = Semester::query()->create(['name' => 'Semestre 2', 'code' => 'S2', 'slug' => 's2']);

        $this->course = Course::query()->create([
            'department_id' => $department->id,
            'level_id' => $level->id,
            'semester_id' => $semester->id,
            'name' => 'Chimie hétérocyclique', 'code' => 'CHI3616', 'slug' => 'chi3616',
        ]);

        $this->tag = DocumentTag::query()->create(['name' => 'Révision', 'slug' => 'revision']);

        $owner = User::factory()->create();

        $this->exam = Document::query()->create([
            'uuid' => (string) Str::uuid(),
            'course_id' => $this->course->id,
            'user_id' => $owner->id,
            'title' => 'Examen de chimie',
            'original_name' => 'examen.pdf',
            'slug' => 'examen-chimie-'.uniqid(),
            'doc_type' => 'exam',
            'visibility' => 'public',
            'downloads_count' => 12,
            'views_count' => 40,
            'file_hash' => hash('sha256', uniqid('', true)),
            'status' => 'approved',
        ]);
        $this->exam->tags()->attach($this->tag->id);

        $this->tp = Document::query()->create([
            'uuid' => (string) Str::uuid(),
            'course_id' => $this->course->id,
            'user_id' => $owner->id,
            'title' => 'TP dosages',
            'original_name' => 'tp.pdf',
            'slug' => 'tp-dosages-'.uniqid(),
            'doc_type' => 'tp',
            'visibility' => 'faculty',
            'downloads_count' => 2,
            'views_count' => 5,
            'file_hash' => hash('sha256', uniqid('', true)),
            'status' => 'approved',
        ]);

        // `created_at` n'est pas fillable : on le force après création pour
        // couvrir le filtre de plage de dates.
        $this->exam->forceFill(['created_at' => '2026-01-15 10:00:00'])->save();
        $this->tp->forceFill(['created_at' => '2026-05-20 10:00:00'])->save();
    }

    /**
     * @param array<string, mixed> $query
     * @return array<int, int> Identifiants des documents returned.
     */
    private function searchIds(array $query): array
    {
        $response = $this->getJson('/api/v1/search?'.http_build_query($query));

        $response->assertOk();

        return collect($response->json('data'))->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    public function test_filters_by_document_type(): void
    {
        $ids = $this->searchIds(['doc_type' => 'exam']);

        $this->assertContains($this->exam->id, $ids);
        $this->assertNotContains($this->tp->id, $ids);
    }

    public function test_filters_by_visibility(): void
    {
        $ids = $this->searchIds(['visibility' => 'faculty']);

        $this->assertContains($this->tp->id, $ids);
        $this->assertNotContains($this->exam->id, $ids);
    }

    public function test_filters_by_tag(): void
    {
        $ids = $this->searchIds(['tag_id' => $this->tag->id]);

        $this->assertContains($this->exam->id, $ids);
        $this->assertNotContains($this->tp->id, $ids);
    }

    public function test_filters_by_date_range(): void
    {
        $ids = $this->searchIds(['from_date' => '2026-05-01', 'to_date' => '2026-05-31']);

        $this->assertContains($this->tp->id, $ids);
        $this->assertNotContains($this->exam->id, $ids);
    }

    public function test_filters_by_minimum_downloads_and_views(): void
    {
        $ids = $this->searchIds(['min_downloads' => 10]);

        $this->assertContains($this->exam->id, $ids);
        $this->assertNotContains($this->tp->id, $ids);

        $ids = $this->searchIds(['min_views' => 30]);

        $this->assertContains($this->exam->id, $ids);
        $this->assertNotContains($this->tp->id, $ids);
    }

    public function test_filters_by_academic_scope(): void
    {
        $ids = $this->searchIds(['course_id' => $this->course->id]);

        $this->assertContains($this->exam->id, $ids);
        $this->assertContains($this->tp->id, $ids);

        $ids = $this->searchIds(['course_id' => $this->course->id, 'doc_type' => 'tp']);

        $this->assertNotContains($this->exam->id, $ids);
        $this->assertContains($this->tp->id, $ids);
    }

    public function test_search_without_keyword_returns_filtered_documents(): void
    {
        // Navigation par filtres seule (pas de mot-clé) : doit rester supporté.
        $ids = $this->searchIds(['doc_type' => 'tp']);

        $this->assertContains($this->tp->id, $ids);
        $this->assertNotContains($this->exam->id, $ids);
    }

    public function test_only_approved_documents_are_returned(): void
    {
        Document::query()->create([
            'uuid' => (string) Str::uuid(),
            'course_id' => $this->course->id,
            'user_id' => User::factory()->create()->id,
            'title' => 'Document en attente',
            'original_name' => 'pending.pdf',
            'slug' => 'pending-'.uniqid(),
            'doc_type' => 'exam',
            'file_hash' => hash('sha256', uniqid('', true)),
            'status' => 'pending',
        ]);

        $ids = $this->searchIds(['doc_type' => 'exam']);

        $this->assertContains($this->exam->id, $ids);
        $this->assertCount(1, $ids);
    }

    public function test_search_exposes_tags_in_payload(): void
    {
        $response = $this->getJson('/api/v1/search?doc_type=exam');

        $response->assertOk();
        $this->assertNotNull($response->json('data.0.tags'));
    }

    public function test_filters_by_multiple_document_types(): void
    {
        // Puces groupees (Examens = exam + correction) : filtre cote serveur.
        $ids = $this->searchIds(['doc_types' => ['exam', 'tp']]);

        $this->assertContains($this->exam->id, $ids);
        $this->assertContains($this->tp->id, $ids);
    }

    public function test_rejects_unknown_document_type(): void
    {
        $this->getJson('/api/v1/search?doc_types[]=inconnu')
            ->assertStatus(422)
            ->assertJsonValidationErrors('doc_types.0');
    }

    public function test_filters_by_level_and_semester(): void
    {
        $levelId = Level::query()->where('code', 'BAC3')->value('id');
        $semesterId = Semester::query()->where('code', 'S2')->value('id');

        $ids = $this->searchIds(['level_id' => $levelId, 'semester_id' => $semesterId]);

        $this->assertContains($this->exam->id, $ids);
        $this->assertContains($this->tp->id, $ids);

        $otherLevel = Level::query()->create(['name' => 'Maitrise 1', 'code' => 'M1', 'slug' => 'm1']);
        $ids = $this->searchIds(['level_id' => $otherLevel->id]);

        $this->assertNotContains($this->exam->id, $ids);
        $this->assertNotContains($this->tp->id, $ids);
    }
}
