<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\NotificationRepository;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
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

    /**
     * Toutes les notifications d'un utilisateur.
     */
    public function getByUserId(int $userId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->notificationRepository->getByUserId($userId);
    }

    /**
     * Notifications non lues d'un utilisateur.
     */
    public function getUnreadByUserId(int $userId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->notificationRepository->getUnreadByUserId($userId);
    }

    /**
     * Marque une notification comme lue.
     */
    public function markAsRead(string $id): Model
    {
        return $this->notificationRepository->markAsRead($id);
    }

    /**
     * Diffuse un message personnalisé à tous les utilisateurs (broadcast).
     * Crée une notification de type broadcast.custom pour chaque user.
     *
     * @param  array{title: string, body?: string, message?: string, type?: string}  $data
     * @return int Nombre de notifications créées
     */
    public function broadcast(array $data): int
    {
        $title = trim((string) ($data['title'] ?? ''));
        $body = trim((string) ($data['body'] ?? $data['message'] ?? ''));
        $type = trim((string) ($data['type'] ?? 'broadcast.custom')) ?: 'broadcast.custom';

        $count = 0;
        DB::transaction(function () use ($title, $body, $type, &$count): void {
            $now = now();
            $users = User::query()->select('id')->get();
            foreach ($users as $user) {
                $this->notificationRepository->create([
                    'id' => (string) Str::uuid(),
                    'user_id' => $user->id,
                    'type' => $type,
                    'title' => $title,
                    'data' => ['body' => $body, 'message' => $body],
                    'sent_at' => $now,
                ]);
                $count++;
            }
        });

        return $count;
    }
}
