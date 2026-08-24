<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for Department entities.
 *
 * @mixin \App\Models\Department
 */
class DepartmentResource extends JsonResource
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
            'faculty' => $this->whenLoaded(
                'faculty',
                fn () => $this->faculty
                    ? new FacultyResource($this->faculty)
                    : null
            ),
            'name' => $this->name,
            'code' => $this->code,
            'slug' => $this->slug,
            'short_name' => $this->short_name,
            'description' => $this->description,
            'logo' => $this->logo,
            'banner' => $this->banner,
            'color' => $this->color,
            'icon' => $this->icon,
            'total_courses' => $this->total_courses,
            'total_documents' => $this->total_documents,
            'total_students' => $this->total_students,
            'is_public' => $this->is_public,
            'status' => $this->status,
            'courses' => $this->whenLoaded(
                'courses',
                fn () => CourseResource::collection($this->courses)
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
