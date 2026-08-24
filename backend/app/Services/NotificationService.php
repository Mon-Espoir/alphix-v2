<?php

namespace App\Services;

use App\Repositories\NotificationRepository;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Application service for notification domain operations.
 */
class NotificationService
{
    /**
     * @param  NotificationRepository  $notificationRepository  Notification data access
     */
    public function __construct(
        protected NotificationRepository $notificationRepository
    ) {
    }

    /**
     * Notify a user that a document was uploaded.
     *
     * @param  array<string, mixed>  $data
     */
    public function notifyUpload(int $userId, array $data = []): Model
    {
        return $this->notificationRepository->create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'type' => 'document.uploaded',
            'title' => $data['title'] ?? 'Nouveau document téléversé',
            'data' => $data['data'] ?? $data,
            'sent_at' => now(),
        ]);
    }

    /**
     * Notify a user that a document was approved.
     *
     * @param  array<string, mixed>  $data
     */
    public function notifyApproval(int $userId, array $data = []): Model
    {
        return $this->notificationRepository->create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'type' => 'document.approved',
            'title' => $data['title'] ?? 'Document approuvé',
            'data' => $data['data'] ?? $data,
            'sent_at' => now(),
        ]);
    }

    /**
     * Notify a user that a document was rejected.
     *
     * @param  array<string, mixed>  $data
     */
    public function notifyRejection(int $userId, array $data = []): Model
    {
        return $this->notificationRepository->create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'type' => 'document.rejected',
            'title' => $data['title'] ?? 'Document rejeté',
            'data' => $data['data'] ?? $data,
            'sent_at' => now(),
        ]);
    }
}
