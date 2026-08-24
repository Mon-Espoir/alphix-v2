<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for Notification entities.
 *
 * @mixin \App\Models\Notification
 */
class NotificationResource extends JsonResource
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
            'type' => $this->type,
            'title' => $this->title,
            'data' => $this->data,
            'read_at' => $this->read_at,
            'sent_at' => $this->sent_at,
            'user' => $this->whenLoaded(
                'user',
                fn () => $this->user
                    ? new UserResource($this->user)
                    : null
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
