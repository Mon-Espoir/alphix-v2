<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for Document entities.
 *
 * Sensitive fields (file_hash, credentials, passwords) are never exposed.
 *
 * @mixin \App\Models\Document
 */
class DocumentResource extends JsonResource
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
            'course' => $this->whenLoaded(
                'course',
                fn () => $this->course
                    ? new CourseResource($this->course)
                    : null
            ),
            'uploader' => $this->whenLoaded(
                'user',
                fn () => $this->user
                    ? new UserResource($this->user)
                    : null
            ),
            'google_drive' => $this->whenLoaded(
                'googleDrive',
                fn () => $this->googleDrive
                    ? new GoogleDriveResource($this->googleDrive)
                    : null
            ),
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'doc_type' => $this->doc_type,
            'academic_year' => $this->academic_year,
            'language' => $this->language,
            'mime_type' => $this->mime_type,
            'pages' => $this->pages,
            'file_size' => $this->file_size,
            'version' => $this->version,
            'visibility' => $this->visibility,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'views_count' => $this->views_count,
            'downloads_count' => $this->downloads_count,
            'ocr_status' => $this->ocr_status,
            'published_at' => $this->published_at,
            'tags' => $this->whenLoaded(
                'tags',
                fn () => DocumentTagResource::collection($this->tags)
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
