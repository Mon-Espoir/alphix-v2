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
            'course_id' => $this->course_id,
            'google_drive_id' => $this->google_drive_id,
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
            // URL API robuste (sert le fichier depuis public OU private, sans dépendre du symlink seul).
            // Le frontend fallback toujours sur drive_* si l'API échoue, mais file_url pointe désormais en priorité sur l'API.
            'file_url' => url("/api/v1/documents/{$this->id}/file"),
            'api_file_url' => url("/api/v1/documents/{$this->id}/file"),
            'api_preview_url' => url("/api/v1/documents/{$this->id}/preview"),
            'drive_file_id' => $this->drive_file_id,
            'drive_web_view_link' => $this->drive_web_view_link,
            'drive_download_link' => $this->drive_download_link,
            'original_name' => $this->original_name,
            'tags' => $this->whenLoaded(
                'tags',
                fn () => DocumentTagResource::collection($this->tags)
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
