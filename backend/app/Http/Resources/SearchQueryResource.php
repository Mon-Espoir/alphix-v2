<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for SearchQuery entities.
 *
 * @mixin \App\Models\SearchQuery
 */
class SearchQueryResource extends JsonResource
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
            'query' => $this->query,
            'results_count' => $this->results_count,
            'user' => $this->whenLoaded(
                'user',
                fn () => $this->user
                    ? new UserResource($this->user)
                    : null
            ),
            'faculty' => $this->whenLoaded(
                'faculty',
                fn () => $this->faculty
                    ? new FacultyResource($this->faculty)
                    : null
            ),
            'department' => $this->whenLoaded(
                'department',
                fn () => $this->department
                    ? new DepartmentResource($this->department)
                    : null
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
