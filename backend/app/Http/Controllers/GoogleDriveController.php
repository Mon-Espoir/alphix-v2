<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGoogleDriveRequest;
use App\Http\Requests\UpdateGoogleDriveRequest;
use App\Http\Resources\GoogleDriveResource;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GoogleDriveController extends Controller
{
    public function __construct(
        protected GoogleDriveService $googleDriveService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $googleDrives = $this->googleDriveService->all();

        return GoogleDriveResource::collection($googleDrives);
    }

    public function store(StoreGoogleDriveRequest $request): JsonResponse
    {
        $googleDrive = $this->googleDriveService->create($request->validated());

        return (new GoogleDriveResource($googleDrive))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): GoogleDriveResource
    {
        $googleDrive = $this->googleDriveService->find($id);

        return new GoogleDriveResource($googleDrive);
    }

    public function update(UpdateGoogleDriveRequest $request, int $id): GoogleDriveResource
    {
        $googleDrive = $this->googleDriveService->update($id, $request->validated());

        return new GoogleDriveResource($googleDrive);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->googleDriveService->delete($id);

        return response()->json(null, 204);
    }

    public function defaultDrive(): GoogleDriveResource|JsonResponse
    {
        $googleDrive = $this->googleDriveService->defaultDrive();

        if (! $googleDrive) {
            return response()->json(["message" => "No default drive found"], 404);
        }

        return new GoogleDriveResource($googleDrive);
    }

    public function activeByPriority(): AnonymousResourceCollection
    {
        $googleDrives = $this->googleDriveService->activeByPriority();

        return GoogleDriveResource::collection($googleDrives);
    }
}
