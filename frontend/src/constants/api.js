/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Constantes de la couche API
 * ---------------------------------------------------------------------------
 * Source unique de vérité pour toutes les valeurs STATIQUES liées au réseau.
 *
 * Règles :
 *   - aucune logique métier, uniquement des constantes figées ;
 *   - les autres modules importent ces constantes au lieu de dupliquer
 *     des littéraux (headers, codes HTTP, types d'erreurs, clés stockage).
 */

import { ENV } from '../config/env'

/**
 * URL de base de l'API Laravel (ex. https://api.alphix.app/api/v1).
 * Résolue une seule fois depuis l'environnement centralisé.
 */
export const API_BASE_URL = ENV.API_BASE_URL

/**
 * Timeout par défaut des requêtes HTTP en millisecondes.
 */
export const API_TIMEOUT_MS = ENV.API_TIMEOUT_MS

/**
 * Nom du header HTTP portant le jeton d'authentification.
 */
export const AUTHORIZATION_HEADER = 'Authorization'

/**
 * Préfixe du schéma d'authentification JWT/Bearer
 * (format attendu par Laravel : "Authorization: Bearer <token>").
 */
export const AUTH_BEARER_PREFIX = 'Bearer '

/**
 * Headers HTTP appliqués par défaut à chaque requête JSON.
 * Note : Axios écrase automatiquement `Content-Type` avec le bon boundary
 * lorsqu'un FormData est transmis (upload de fichiers).
 */
export const DEFAULT_HEADERS = Object.freeze({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
})

/**
 * Sous-ensemble des codes statut HTTP utilisés par la couche réseau.
 * Évite les « magic numbers » dans la gestion des erreurs.
 */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
})

/**
 * Taxonomie des erreurs API après normalisation.
 * Permet aux couches hautes (features, UI) de réagir par TYPE
 * sans connaître Axios ni les détails HTTP.
 */
export const API_ERROR_TYPES = Object.freeze({
  /** Serveur injoignable / DNS / CORS / hors-ligne. */
  NETWORK: 'NETWORK_ERROR',
  /** Dépassement du délai d'attente. */
  TIMEOUT: 'TIMEOUT_ERROR',
  /** Requête annulée volontairement (AbortController). */
  CANCELLED: 'REQUEST_CANCELLED',
  /** Jeton absent, expiré ou invalide. */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** Droits insuffisants sur la ressource. */
  FORBIDDEN: 'FORBIDDEN',
  /** Ressource inexistante. */
  NOT_FOUND: 'NOT_FOUND',
  /** Erreurs de validation Laravel (payload `errors`). */
  VALIDATION: 'VALIDATION_ERROR',
  /** Conflit d'état (doublon, version obsolète...). */
  CONFLICT: 'CONFLICT',
  /** Trop de requêtes (throttling). */
  RATE_LIMITED: 'RATE_LIMITED',
  /** Erreur côté serveur (5xx). */
  SERVER: 'SERVER_ERROR',
  /** Autre erreur client (4xx non catégorisée). */
  CLIENT: 'CLIENT_ERROR',
  /** Erreur non reconnue (bug applicatif, erreur JS...). */
  UNKNOWN: 'UNKNOWN_ERROR',
})

/**
 * Espace de noms et clés de persistance locale (localStorage).
 * Le préfixe évite toute collision avec d'autres apps hébergées
 * sur le même origine (webview Capacitor incluse).
 */
export const STORAGE_PREFIX = 'alphix.v2'

/** Clés de stockage utilisées par le socle technique. */
export const STORAGE_KEYS = Object.freeze({
  /** Jeton d'authentification JWT/Bearer. */
  AUTH_TOKEN: `${STORAGE_PREFIX}:auth:token`,
  /** Guide de première visite déjà affiché (valeur "1" = vu). */
  WELCOME_SEEN: `${STORAGE_PREFIX}:ui:welcome-seen`,
})
