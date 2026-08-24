<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for User entities.
 *
 * Password and remember_token are never exposed.
 *
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
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
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
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
            'avatar' => $this->avatar,
        ];
    }
}
