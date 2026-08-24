<?php

namespace App\Repositories;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the notifications table.
 */
class NotificationRepository extends BaseRepository
{
    /**
     * Create a new notification repository instance.
     */
    public function __construct(Notification $model)
    {
        parent::__construct($model);
    }

    /**
     * Retrieve notifications for a given user.
     *
     * @return Collection<int, Notification>
     */
    public function getByUserId(int $userId): Collection
    {
        return $this->query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve unread notifications for a given user.
     *
     * @return Collection<int, Notification>
     */
    public function getUnreadByUserId(int $userId): Collection
    {
        return $this->query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve notifications filtered by type.
     *
     * @return Collection<int, Notification>
     */
    public function getByType(string $type): Collection
    {
        return $this->query()
            ->where('type', $type)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(string $id): Notification
    {
        /** @var Notification */
        return $this->update($id, ['read_at' => now()]);
    }
}
