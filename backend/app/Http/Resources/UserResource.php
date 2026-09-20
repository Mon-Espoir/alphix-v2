<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for User entities.
 *
 * Password and remember_token are never exposed.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'faculty_id' => $this->faculty_id,
            'department_id' => $this->department_id,
            'level_id' => $this->level_id,
            'last_login_at' => $this->last_login_at,
            'last_activity_at' => $this->last_activity_at,
            'created_at' => $this->created_at,
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
