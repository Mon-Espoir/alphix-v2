<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSemesterRequest;
use App\Http\Requests\UpdateSemesterRequest;
use App\Http\Resources\SemesterResource;
use App\Services\SemesterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SemesterController extends Controller
{
    public function __construct(
        protected SemesterService $semesterService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $semesters = $this->semesterService->all();

        return SemesterResource::collection($semesters);
    }

    public function store(StoreSemesterRequest $request): JsonResponse
    {
        $semester = $this->semesterService->create($request->validated());

        return (new SemesterResource($semester))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): SemesterResource
    {
        $semester = $this->semesterService->find($id);

        return new SemesterResource($semester);
    }

    public function update(UpdateSemesterRequest $request, int $id): SemesterResource
    {
        $semester = $this->semesterService->update($id, $request->validated());

        return new SemesterResource($semester);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->semesterService->delete($id);

        return response()->json(null, 204);
    }

    public function activeOrdered(): AnonymousResourceCollection
    {
        $semesters = $this->semesterService->activeOrdered();

        return SemesterResource::collection($semesters);
    }
}
