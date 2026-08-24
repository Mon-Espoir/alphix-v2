/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Configuration globale de la couche API
 * ---------------------------------------------------------------------------
 * Fusionne l'environnement (`config/env.js`) et les constantes
 * (`constants/api.js`) en un objet de configuration unique, figé,
 * consommé par le client Axios (`api/client.js`).
 *
 * Aucune logique métier : uniquement la composition de la configuration.
 */

import { ENV } from './env'
import { DEFAULT_HEADERS } from '../constants/api'

/**
 * Configuration runtime de la couche HTTP.
 */
export const apiConfig = Object.freeze({
  /** URL de base de l'API (ex. https://host/api/v1). */
  baseURL: ENV.API_BASE_URL,

  /** Timeout global des requêtes (ms). */
  timeout: ENV.API_TIMEOUT_MS,

  /** Headers par défaut appliqués à chaque requête. */
  headers: { ...DEFAULT_HEADERS },

  /**
   * Stratégie d'authentification résolue :
   * - 'token'  => JWT/Bearer injecté via interceptor + storage local ;
   * - 'cookie' => session stateful Sanctum, cookies transmis.
   */
  authMode: ENV.AUTH_MODE,

  /** Active l'injection automatique du header Authorization: Bearer <token>. */
  useBearer: ENV.AUTH_MODE === 'token',

  /** Transmet les credentials/cookies (requis pour Sanctum en mode 'cookie'). */
  withCredentials: ENV.AUTH_MODE === 'cookie',

  /** Nom applicatif (utilisable pour les traces / user-agent). */
  appName: ENV.APP_NAME,

  /** Environnement d'exécution courant ('development' | 'production' | ...). */
  appEnv: ENV.APP_ENV,

  /** Raccourci : logs verbeux et diagnostics actifs en développement. */
  isDev: ENV.IS_DEV,
})

export default apiConfig
