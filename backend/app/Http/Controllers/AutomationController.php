<?php

namespace App\Http\Controllers;

use App\Http\Resources\GoogleDriveResource;
use App\Services\AutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationController extends Controller
{
    public function __construct(
        protected AutomationService $automationService
    ) {
    }

    public function synchronizeDrive(Request $request, int $driveId): JsonResponse
    {
        $this->automationService->synchronizeDrive($driveId, $request->all());

        return response()->json(null, 204);
    }

    public function processPendingDocuments(): JsonResponse
    {
        $result = $this->automationService->processPendingDocuments();

        return response()->json($result);
    }

    public function resolveTargetDrive(): GoogleDriveResource|JsonResponse
    {
        $googleDrive = $this->automationService->resolveTargetDrive();

        if (! $googleDrive) {
            return response()->json(["message" => "No target drive found"], 404);
        }

        return new GoogleDriveResource($googleDrive);
    }
}
