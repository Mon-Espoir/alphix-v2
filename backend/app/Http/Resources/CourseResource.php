<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for Course entities.
 *
 * The API field "title" maps to the database column "name".
 *
 * @mixin \App\Models\Course
 */
class CourseResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            // Identifiants bruts : indispensables au filtrage cote client
            // (cascade faculte -> departement -> niveau -> semestre).
            'department_id' => $this->department_id,
            'level_id' => $this->level_id,
            'semester_id' => $this->semester_id,
            'department' => $this->whenLoaded(
                'department',
                fn () => $this->department
                    ? new DepartmentResource($this->department)
                    : null
            ),
            'semester' => $this->whenLoaded(
                'semester',
                fn () => $this->semester
                    ? new SemesterResource($this->semester)
                    : null
            ),
            'level' => $this->whenLoaded(
                'level',
                fn () => $this->level
                    ? new LevelResource($this->level)
                    : null
            ),
            'code' => $this->code,
            'title' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'credits' => $this->credits,
            'coefficient' => $this->coefficient,
            'hours' => $this->hours,
            'teacher' => $this->teacher,
            'color' => $this->color,
            'icon' => $this->icon,
            'total_documents' => $this->documents_count ?? $this->total_documents,
            'documents_count' => $this->when(isset($this->documents_count), $this->documents_count),
            'total_downloads' => $this->total_downloads,
            'total_views' => $this->total_views,
            'status' => $this->status,
            'documents' => $this->whenLoaded(
                'documents',
                fn () => DocumentResource::collection($this->documents)
            ),
            'google_drive' => $this->whenLoaded(
                'googleDrive',
                fn () => $this->googleDrive
                    ? new GoogleDriveResource($this->googleDrive)
                    : null
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
