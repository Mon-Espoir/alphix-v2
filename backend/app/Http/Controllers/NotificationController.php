<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {
    }

    // public function index(): AnonymousResourceCollection
    // {
    //     $notifications = $this->notificationService->all();

    //     return NotificationResource::collection($notifications);
    // }

    // public function show(int $id): NotificationResource
    // {
    //     $notification = $this->notificationService->find($id);

    //     return new NotificationResource($notification);
    // }

    public function notifyUpload(int $userId): JsonResponse
    {
        $this->notificationService->notifyUpload($userId);

        return response()->json(null, 204);
    }

    public function notifyApproval(int $userId): JsonResponse
    {
        $this->notificationService->notifyApproval($userId);

        return response()->json(null, 204);
    }

    public function notifyRejection(int $userId): JsonResponse
    {
        $this->notificationService->notifyRejection($userId);

        return response()->json(null, 204);
    }

    public function byUser(int $userId): AnonymousResourceCollection
    {
        $notifications = $this->notificationService->getByUserId($userId);

        return NotificationResource::collection($notifications);
    }

    public function unreadByUser(int $userId): AnonymousResourceCollection
    {
        $notifications = $this->notificationService->getUnreadByUserId($userId);

        return NotificationResource::collection($notifications);
    }

    public function markAsRead(string $id): NotificationResource
    {
        $notification = $this->notificationService->markAsRead($id);

        return new NotificationResource($notification);
    }
}
