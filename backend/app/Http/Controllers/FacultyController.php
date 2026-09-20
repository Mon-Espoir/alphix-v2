<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFacultyRequest;
use App\Http\Requests\UpdateFacultyRequest;
use App\Http\Resources\FacultyResource;
use App\Models\Faculty;
use App\Services\FacultyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

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
        Gate::authorize('create', Faculty::class);

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
        Gate::authorize('update', $this->facultyService->find($id));

        $faculty = $this->facultyService->update($id, $request->validated());

        return new FacultyResource($faculty);
    }

    public function destroy(int $id): JsonResponse
    {
        Gate::authorize('delete', $this->facultyService->find($id));

        $this->facultyService->delete($id);

        return response()->json(null, 204);
    }
}
