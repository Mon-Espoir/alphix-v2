/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Endpoints API
 * ---------------------------------------------------------------------------
 * Chemins relatifs aux endpoints du backend Laravel (baseURL inclut déjà
 * `/api/v1` — voir config/env.js). Aligné sur `backend/routes/api.php`.
 *
 * Seuls les endpoints d'infrastructure sont déclarés ici ; les endpoints
 * métier (faculties, documents...) seront ajoutés par leurs features
 * respectives dans les phases suivantes.
 */

/** Endpoints d'authentification Sanctum (Bearer Token). */
export const AUTH_ENDPOINTS = Object.freeze({
  /** POST — Inscription. Réponse : { message, user, token }. */
  REGISTER: '/register',
  /** POST — Connexion. Réponse : { message, user, token }. */
  LOGIN: '/login',
  /** POST — Déconnexion (protégé). Réponse : { message }. */
  LOGOUT: '/logout',
  /** GET — Profil courant (protégé). Réponse : { user }. */
  ME: '/me',
  /** PUT — Mise à jour du profil (protégé). Réponse : { message, user }. */
  PROFILE: '/profile',
})

/** Endpoints système/infrastructure (publics, légers). */
export const SYSTEM_ENDPOINTS = Object.freeze({
  /** GET — Statut maintenance (léger, public). Sert aussi de "ping" de réveil. */
  STATUS: '/maintenance/status',
})

/** Regroupement par domaine pour import sélectif. */
export const API_ENDPOINTS = Object.freeze({
  AUTH: AUTH_ENDPOINTS,
  SYSTEM: SYSTEM_ENDPOINTS,
})
