<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Http\Resources\CourseResource;
use App\Services\CourseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourseController extends Controller
{
    public function __construct(
        protected CourseService $courseService
    ) {
    }

    // public function index(): AnonymousResourceCollection
    // {
    //     $courses = $this->courseService->all();

    //     return CourseResource::collection($courses);
    // }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $course = $this->courseService->create($request->validated());

        return (new CourseResource($course))
            ->response()
            ->setStatusCode(201);
    }

    // public function show(int $id): CourseResource
    // {
    //     $course = $this->courseService->find($id);

    //     return new CourseResource($course);
    // }

    public function update(UpdateCourseRequest $request, int $id): CourseResource
    {
        $course = $this->courseService->update($id, $request->validated());

        return new CourseResource($course);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->courseService->delete($id);

        return response()->json(null, 204);
    }

    public function byDepartment(int $departmentId): AnonymousResourceCollection
    {
        $courses = $this->courseService->byDepartment($departmentId);

        return CourseResource::collection($courses);
    }

    public function bySemester(int $semesterId): AnonymousResourceCollection
    {
        $courses = $this->courseService->bySemester($semesterId);

        return CourseResource::collection($courses);
    }

    public function byLevel(int $levelId): AnonymousResourceCollection
    {
        $courses = $this->courseService->byLevel($levelId);

        return CourseResource::collection($courses);
    }
}
