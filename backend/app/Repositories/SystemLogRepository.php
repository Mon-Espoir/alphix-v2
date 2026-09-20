<?php

namespace App\Repositories;

use App\Models\SystemLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class SystemLogRepository extends BaseRepository
{
    public function __construct(SystemLog $model)
    {
        parent::__construct($model);
    }

    public function paginateWithUser(int $perPage = 15): LengthAwarePaginator
    {
        return $this->query()->with('user')->orderByDesc('created_at')->paginate($perPage);
    }
}
