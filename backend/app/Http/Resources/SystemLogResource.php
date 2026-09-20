<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\SystemLog
 */
class SystemLogResource extends JsonResource
{
    public function toArray($request): array
    {
        $device = $this->device_info ?? $this->context['device_info'] ?? null;
        // Normalize device_info to array/string for frontend
        $deviceInfo = is_array($device) ? $device : ($device ? ['device_info' => $device] : null);
        // Fallback: if device_info is stored as JSON string in device_info column, ensure array
        if (is_string($deviceInfo)) {
            $decoded = json_decode($deviceInfo, true);
            $deviceInfo = $decoded ?? ['device_info' => $deviceInfo];
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', fn () => $this->user ? new \App\Http\Resources\UserResource($this->user) : null),
            'module' => $this->module,
            'action' => $this->action,
            'level' => $this->level,
            'status' => $this->status ?? $this->level,
            'event_type' => $this->event_type ?? $this->module . '.' . $this->action,
            'message' => $this->message,
            'details' => $this->details ?? $this->message,
            'device_info' => $deviceInfo ?? $this->device_info,
            // Formatted string for quick display
            'device_label' => is_array($deviceInfo) ? ($deviceInfo['device_info'] ?? null) : $deviceInfo,
            'context' => $this->context,
            'ip_address' => $this->ip_address,
            'created_at' => $this->created_at,
        ];
    }
}
