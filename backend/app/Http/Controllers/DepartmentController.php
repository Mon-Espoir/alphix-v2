<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use App\Services\DepartmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class DepartmentController extends Controller
{
    public function __construct(
        protected DepartmentService $departmentService
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        $departments = $this->departmentService->all();

        return DepartmentResource::collection($departments);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        Gate::authorize('create', Department::class);

        $department = $this->departmentService->create($request->validated());

        return (new DepartmentResource($department))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): DepartmentResource
    {
        $department = $this->departmentService->find($id);

        return new DepartmentResource($department);
    }

    public function update(UpdateDepartmentRequest $request, int $id): DepartmentResource
    {
        Gate::authorize('update', $this->departmentService->find($id));

        $department = $this->departmentService->update($id, $request->validated());

        return new DepartmentResource($department);
    }

    public function destroy(int $id): JsonResponse
    {
        Gate::authorize('delete', $this->departmentService->find($id));

        $this->departmentService->delete($id);

        return response()->json(null, 204);
    }

    public function byFaculty(int $facultyId): AnonymousResourceCollection
    {
        $departments = $this->departmentService->byFaculty($facultyId);

        return DepartmentResource::collection($departments);
    }
}
