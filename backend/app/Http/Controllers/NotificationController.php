<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    /**
     * Broadcast custom message to all users (admin only).
     * Body: { title: string, body?: string, message?: string, type?: string }
     */
    public function broadcast(Request $request): JsonResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:5000'],
            'message' => ['nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();
        $role = strtolower(trim((string) ($user->role ?? '')));
        $allowed = ['admin', 'administrator', 'super_admin', 'superadmin'];
        if (!in_array($role, $allowed, true)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $title = trim((string) $request->input('title'));
        $body = trim((string) ($request->input('body') ?? $request->input('message') ?? ''));
        if ($body === '') {
            return response()->json(['message' => 'Le contenu du message est requis.', 'errors' => ['body' => ['Le champ body est obligatoire.']]], 422);
        }

        $count = $this->notificationService->broadcast([
            'title' => $title,
            'body' => $body,
            'type' => $request->input('type') ?? 'broadcast.custom',
        ]);

        return response()->json(['message' => 'Diffusion envoyée.', 'count' => $count], 201);
    }

    /**
     * Current authenticated user notifications (convenience, avoids IDOR).
     */
    public function me(Request $request): AnonymousResourceCollection
    {
        $notifications = $this->notificationService->getByUserId((int) $request->user()->id);

        return NotificationResource::collection($notifications);
    }

    public function myUnread(Request $request): AnonymousResourceCollection
    {
        $notifications = $this->notificationService->getUnreadByUserId((int) $request->user()->id);

        return NotificationResource::collection($notifications);
    }
}
