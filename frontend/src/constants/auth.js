/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Constantes d'authentification
 * ---------------------------------------------------------------------------
 * Machine à états du cycle de vie de la session utilisateur.
 */

/**
 * Statuts possibles de la session.
 * - IDLE             : état initial avant toute résolution.
 * - INITIALIZING     : restauration de session au démarrage (boot).
 * - AUTHENTICATED    : session valide (token + user).
 * - UNAUTHENTICATED  : aucune session.
 */
export const AUTH_STATUS = Object.freeze({
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
})
