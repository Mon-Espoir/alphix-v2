<?php

namespace App\Http\Controllers;

use App\Services\SecondaryAIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Controleur IA secondaire (admin uniquement, lecture seule)
 * ---------------------------------------------------------------------------
 * Expose le statut (toggle, quota) et la mise a jour (toggle + cle).
 * La recherche SQL reste inchangee et repond toujours en premier.
 */
class SecondaryAIController extends Controller
{
    public function __construct(
        protected SecondaryAIService $secondaryAI
    ) {}

    /**
     * Statut courant (toggle, configuration, dernier statut quota).
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'data' => $this->secondaryAI->status(),
        ]);
    }

    /**
     * Mise a jour admin : toggle ON/OFF, cle API et/ou modele.
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'enabled' => ['sometimes', 'boolean'],
                'api_key' => ['sometimes', 'nullable', 'string', 'max:500'],
                'model' => ['sometimes', 'nullable', 'string', 'max:100'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Donnees invalides.',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            if (array_key_exists('enabled', $validated)) {
                $this->secondaryAI->setEnabled((bool) $validated['enabled']);
            }

            if (array_key_exists('api_key', $validated)) {
                $this->secondaryAI->setApiKey((string) ($validated['api_key'] ?? ''));
            }

            if (array_key_exists('model', $validated)) {
                $this->secondaryAI->setModel((string) ($validated['model'] ?? ''));
            }

            return response()->json([
                'message' => 'Configuration IA mise a jour.',
                'data' => $this->secondaryAI->status(),
            ]);
        } catch (\Throwable) {
            return response()->json([
                'message' => 'Echec de la mise a jour (repli SQL actif).',
                'data' => $this->secondaryAI->status(),
            ], 500);
        }
    }
}
