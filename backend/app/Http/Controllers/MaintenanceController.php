<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MaintenanceController extends Controller
{
    private const KEY = 'alphix.maintenance.enabled';

    public function status(): JsonResponse
    {
        $enabled = (bool) Cache::get(self::KEY, false);

        return response()->json([
            'enabled' => $enabled,
            'message' => $enabled ? 'Maintenance active' : 'Maintenance inactive',
        ]);
    }

    public function toggle(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $enabled = (bool) $validated['enabled'];
        Cache::forever(self::KEY, $enabled);

        return response()->json([
            'enabled' => $enabled,
            'message' => $enabled ? 'Mode maintenance activé.' : 'Mode maintenance désactivé.',
        ]);
    }
}
