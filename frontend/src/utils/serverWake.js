/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Réveil du serveur (Render Free Tier)
 * ---------------------------------------------------------------------------
 * Le backend dort après ~15 min d'inactivité : la première requête (cold
 * start) peut prendre 25-60 s, au-delà du timeout Axios standard (30 s).
 * Sans garde-fou, le login échoue en timeout et l'utilisateur croit que
 * « rien ne répond ».
 *
 * Stratégie :
 *   - avant toute requête d'authentification, on "ping" l'endpoint système
 *     léger `/maintenance/status` avec un timeout long (90 s) qui absorbe
 *     le cold start ;
 *   - en cas de timeout/réseau, on retente UNE fois (le 2e appel trouve un
 *     serveur déjà chaud et répond en ~1 s) ;
 *   - état "chaud" mémorisé 10 min (TTL < 15 min d'endormissement Render)
 *     pour ne pas payer un ping à chaque action.
 *
 * Aucune logique métier : uniquement de la résilience transport.
 */

import apiClient from '../api/client'
import { API_ENDPOINTS } from '../constants/endpoints'
import { API_ERROR_TYPES } from '../constants/api'

/** Timeout du ping de réveil : absorbe le cold start Render (25-60 s). */
export const WAKE_TIMEOUT_MS = 90_000

/** Durée de validité de l'état "serveur chaud" (10 min < 15 min de sleep). */
export const WARM_TTL_MS = 10 * 60_000

/** Horodatage du dernier ping réussi (0 = jamais). */
let lastWarmAt = 0

/**
 * Indique si le serveur est supposé chaud (ping réussi il y a < 10 min).
 * @returns {boolean}
 */
export function isServerWarm() {
  return Date.now() - lastWarmAt < WARM_TTL_MS
}

/**
 * Marque le serveur comme chaud (ex. après toute réponse API réussie
 * observée ailleurs dans l'application).
 */
export function markServerWarm() {
  lastWarmAt = Date.now()
}

/**
 * Réveille le serveur si nécessaire. Ne rejette JAMAIS : au pire, la
 * requête d'authentification suivante tentera sa chance normalement.
 * @returns {Promise<void>}
 */
export async function wakeServer() {
  if (isServerWarm()) return

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await apiClient.get(API_ENDPOINTS.SYSTEM.STATUS, {
        timeout: WAKE_TIMEOUT_MS,
        skipAuth: true,
      })
      markServerWarm()
      return
    } catch (error) {
      // Seuls timeout / réseau justifient un 2e essai (serveur en
      // train de démarrer). Toute autre erreur (4xx/5xx) prouve que le
      // serveur RÉPOND déjà : inutile d'insister.
      const retryable =
        error?.code === 'ECONNABORTED' ||
        error?.type === API_ERROR_TYPES.TIMEOUT ||
        error?.type === API_ERROR_TYPES.NETWORK ||
        !error?.response

      if (!retryable || attempt === 2) return
      // Le 1er appel a lancé le démarrage : le 2e trouve un serveur chaud.
    }
  }
}
