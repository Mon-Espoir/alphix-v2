<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for Google Drive entities.
 *
 * Sensitive fields such as credentials_path are never exposed.
 *
 * @mixin \App\Models\GoogleDrive
 */
class GoogleDriveResource extends JsonResource
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
            'uuid' => $this->uuid,
            'name' => $this->name,
            'code' => $this->code,
            'email' => $this->email,
            'type' => $this->type,
            'storage_limit' => $this->storage_limit,
            'used_storage' => $this->used_storage,
            'available_storage' => $this->available_storage,
            'priority' => $this->priority,
            'health_status' => $this->health_status,
            'upload_count' => $this->upload_count,
            'last_sync_at' => $this->last_sync_at,
            'is_default' => $this->is_default,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
