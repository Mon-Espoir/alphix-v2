<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for Faculty entities.
 *
 * @mixin \App\Models\Faculty
 */
class FacultyResource extends JsonResource
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
            'name' => $this->name,
            'code' => $this->code,
            'slug' => $this->slug,
            'description' => $this->description,
            'logo' => $this->logo,
            'color' => $this->color,
            'icon' => $this->icon,
            'status' => $this->status,
            'departments_count' => $this->whenCounted('departments'),
            'departments' => $this->whenLoaded(
                'departments',
                fn () => DepartmentResource::collection($this->departments)
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
