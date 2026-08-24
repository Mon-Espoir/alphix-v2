<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFacultyRequest;
use App\Http\Requests\UpdateFacultyRequest;
use App\Http\Resources\FacultyResource;
use App\Services\FacultyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FacultyController extends Controller
{
    public function __construct(
        protected FacultyService $facultyService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $faculties = $this->facultyService->all();

        return FacultyResource::collection($faculties);
    }

    public function store(StoreFacultyRequest $request): JsonResponse
    {
        $faculty = $this->facultyService->create($request->validated());

        return (new FacultyResource($faculty))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): FacultyResource
    {
        $faculty = $this->facultyService->find($id);

        return new FacultyResource($faculty);
    }

    public function update(UpdateFacultyRequest $request, int $id): FacultyResource
    {
        $faculty = $this->facultyService->update($id, $request->validated());

        return new FacultyResource($faculty);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->facultyService->delete($id);

        return response()->json(null, 204);
    }
}
