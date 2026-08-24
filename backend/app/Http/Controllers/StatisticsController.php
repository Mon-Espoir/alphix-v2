<?php

namespace App\Http\Controllers;

use App\Http\Resources\DocumentResource;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StatisticsController extends Controller
{
    public function __construct(
        protected StatisticsService $statisticsService
    ) {
    }

    public function updatePopularity(int $documentId): JsonResponse
    {
        $this->statisticsService->updatePopularity($documentId);

        return response()->json(null, 204);
    }

    public function recalculate(): JsonResponse
    {
        $stats = $this->statisticsService->recalculateStatistics();

        return response()->json($stats);
    }
}
