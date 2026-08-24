<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLevelRequest;
use App\Http\Requests\UpdateLevelRequest;
use App\Http\Resources\LevelResource;
use App\Services\LevelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LevelController extends Controller
{
    public function __construct(
        protected LevelService $levelService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $levels = $this->levelService->all();

        return LevelResource::collection($levels);
    }

    public function store(StoreLevelRequest $request): JsonResponse
    {
        $level = $this->levelService->create($request->validated());

        return (new LevelResource($level))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): LevelResource
    {
        $level = $this->levelService->find($id);

        return new LevelResource($level);
    }

    public function update(UpdateLevelRequest $request, int $id): LevelResource
    {
        $level = $this->levelService->update($id, $request->validated());

        return new LevelResource($level);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->levelService->delete($id);

        return response()->json(null, 204);
    }

    public function activeOrdered(): AnonymousResourceCollection
    {
        $levels = $this->levelService->activeOrdered();

        return LevelResource::collection($levels);
    }
}
