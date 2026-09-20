<?php

namespace App\Http\Controllers;

use App\Http\Resources\SystemLogResource;
use App\Services\SystemLogService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SystemLogController extends Controller
{
    public function __construct(
        protected SystemLogService $systemLogService
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min(100, $perPage));

        $logs = $this->systemLogService->paginate($perPage);

        return SystemLogResource::collection($logs);
    }
}
