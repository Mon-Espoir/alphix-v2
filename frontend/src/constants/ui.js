/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Constantes UI globales
 * ---------------------------------------------------------------------------
 * Valeurs partagées par les stores et hooks d'interface (notifications,
 * thème). Mobile first : les durées sont calibrées pour le tactile.
 */

/** Types de notification supportés par la couche feedback. */
export const NOTIFICATION_TYPES = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
})

/** Durée d'affichage par défaut d'une notification auto-dismiss (ms). */
export const NOTIFICATION_DEFAULT_DURATION_MS = 4000

/** Thèmes d'affichage disponibles. */
export const THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
})
