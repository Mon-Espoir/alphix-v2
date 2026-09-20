<?php

namespace App\Services;

use App\Models\SystemLog;
use App\Repositories\SystemLogRepository;
use App\Services\DeviceInfoService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class SystemLogService
{
    public function __construct(
        protected SystemLogRepository $systemLogRepository,
        protected DeviceInfoService $deviceInfoService
    ) {
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->systemLogRepository->paginateWithUser($perPage);
    }

    /**
     * Log an audit event with device info, filtering sensitive data.
     * Never logs passwords/tokens.
     *
     * @param  array{event_type?: string, module?: string, action?: string, level?: string, status?: string, message?: string, details?: string, context?: array, user_id?: int|null, ip?: string|null}  $data
     */
    public function log(Request $request, array $data = []): SystemLog
    {
        $device = $this->deviceInfoService->parse($request);
        $filteredContext = $this->deviceInfoService->filterSensitive((array) ($data['context'] ?? []));
        // Merge device into context for backward compat, but also store separately
        $filteredContext['device_info'] = $device;

        // Also filter details if it's array
        $details = $data['details'] ?? $data['message'] ?? '';
        if (is_array($details)) {
            $details = json_encode($this->deviceInfoService->filterSensitive($details));
        }

        $eventType = $data['event_type'] ?? trim(($data['module'] ?? 'system') . '.' . ($data['action'] ?? 'event'), '.');
        $status = $data['status'] ?? $data['level'] ?? 'info';
        // Map level to status if needed
        $level = $data['level'] ?? ($status === 'success' ? 'info' : ($status === 'failure' ? 'warning' : $status));

        return $this->systemLogRepository->create([
            'user_id' => $data['user_id'] ?? $request->user()?->id,
            'event_type' => $eventType,
            'module' => $data['module'] ?? explode('.', $eventType)[0],
            'action' => $data['action'] ?? (explode('.', $eventType)[1] ?? 'event'),
            'level' => in_array($level, ['info', 'warning', 'error', 'critical'], true) ? $level : 'info',
            'status' => in_array($status, ['success', 'failure', 'warning', 'info', 'error'], true) ? $status : $level,
            'message' => $data['message'] ?? $details,
            'details' => is_string($details) ? $details : json_encode($details),
            'device_info' => $device,
            'context' => $filteredContext,
            'ip_address' => $data['ip'] ?? $request->ip(),
            'created_at' => now(),
        ]);
    }

    /**
     * Helper for auth events (login success/failure).
     */
    public function logAuth(Request $request, string $event, string $status, ?string $email = null, array $extra = []): SystemLog
    {
        $user = $request->user();
        // For failure, user may be null, try to find by email
        if (! $user && $email) {
            $user = \App\Models\User::where('email', $email)->first();
        }
        $message = $extra['message'] ?? match ($event) {
            'auth.login.success' => "Connexion réussie pour {$email}",
            'auth.login.failure' => "Échec de connexion pour {$email}",
            'auth.register.success' => "Inscription réussie pour {$email}",
            default => $event,
        };

        return $this->log($request, array_merge([
            'event_type' => $event,
            'module' => 'auth',
            'action' => str_contains($event, 'login') ? 'login' : (str_contains($event, 'register') ? 'register' : 'event'),
            'level' => $status === 'success' ? 'info' : 'warning',
            'status' => $status,
            'message' => $message,
            'details' => $message,
            'user_id' => $user?->id,
            'context' => $this->deviceInfoService->filterSensitive($extra),
        ], $extra));
    }
}
