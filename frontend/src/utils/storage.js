/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Gestion centralisée du stockage local (jeton d'authentification)
 * ---------------------------------------------------------------------------
 * Wrapper sûr autour de `localStorage` avec repli en mémoire :
 *   - tolère les contextes où localStorage est indisponible ou bloqué
 *     (webview Capacitor en mode privé, quota dépassé, SSR, tests) ;
 *   - n'échoue JAMAIS de manière bloquante : toute erreur est absorbée ;
 *   - n'expose aucune logique métier (uniquement token / valeurs brutes).
 *
 * Sécurité : le jeton JWT n'est JAMAIS journalisé ni sérialisé dans les erreurs.
 */

import { STORAGE_KEYS, STORAGE_PREFIX } from '../constants/api'

/** Repli mémoire quand localStorage est indisponible (session courante). */
const MEMORY_STORE = new Map()

/** Cache du résultat du test de disponibilité (évalué une seule fois). */
let localStorageAvailable = null

/**
 * Détecte la disponibilité réelle de localStorage.
 * Un simple `typeof` ne suffit pas : l'accès peut lever une exception
 * (navigation privée, restrictions webview, etc.).
 * @returns {boolean} true si localStorage est utilisable.
 */
function hasLocalStorage() {
  if (localStorageAvailable !== null) return localStorageAvailable

  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      localStorageAvailable = false
      return false
    }

    const probeKey = `${STORAGE_PREFIX}.__probe__`
    window.localStorage.setItem(probeKey, '1')
    window.localStorage.removeItem(probeKey)
    localStorageAvailable = true
  } catch {
    localStorageAvailable = false
  }
  return localStorageAvailable
}

/**
 * Lit une valeur brute depuis le stockage actif.
 * @param {string} key - Clé de stockage.
 * @returns {string|null} Valeur stockée ou null si absente/indisponible.
 */
function readValue(key) {
  try {
    return hasLocalStorage() ? window.localStorage.getItem(key) : (MEMORY_STORE.get(key) ?? null)
  } catch {
    return null
  }
}

/**
 * Écrit une valeur brute dans le stockage actif.
 * @param {string} key - Clé de stockage.
 * @param {string} value - Valeur à écrire.
 * @returns {boolean} true si l'écriture a réussi.
 */
function writeValue(key, value) {
  try {
    if (hasLocalStorage()) {
      window.localStorage.setItem(key, value)
    } else {
      MEMORY_STORE.set(key, value)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Supprime une valeur brute du stockage actif.
 * @param {string} key - Clé de stockage.
 * @returns {boolean} true si la suppression a réussi.
 */
function deleteValue(key) {
  try {
    if (hasLocalStorage()) {
      window.localStorage.removeItem(key)
    } else {
      MEMORY_STORE.delete(key)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Récupère le jeton d'authentification courant (JWT/Bearer).
 * @returns {string|null} Jeton brut ou null si absent.
 */
export function getToken() {
  return readValue(STORAGE_KEYS.AUTH_TOKEN)
}

/**
 * Persiste le jeton d'authentification.
 * @param {string} token - Jeton JWT brut (sans préfixe "Bearer ").
 * @returns {boolean} true si le jeton a été persisté.
 */
export function setToken(token) {
  if (typeof token !== 'string' || token.trim() === '') return false
  return writeValue(STORAGE_KEYS.AUTH_TOKEN, token.trim())
}

/**
 * Supprime le jeton d'authentification (déconnexion / expiration).
 * Idempotent : supprimer un jeton inexistant reste un succès.
 * @returns {boolean} true si la suppression a réussi.
 */
export function removeToken() {
  return deleteValue(STORAGE_KEYS.AUTH_TOKEN)
}

/**
 * Lit un drapeau booléen persisté (« 1 » = actif).
 * Sert aux préférences d'interface légères (ex. onboarding déjà vu).
 * @param {string} key - Clé de stockage.
 * @returns {boolean} true si le drapeau est actif.
 */
export function readFlag(key) {
  return readValue(key) === '1'
}

/**
 * Persiste (ou efface) un drapeau booléen.
 * @param {string} key - Clé de stockage.
 * @param {boolean} [enabled=true] - Valeur du drapeau.
 * @returns {boolean} true si l'écriture a réussi.
 */
export function writeFlag(key, enabled = true) {
  return enabled ? writeValue(key, '1') : deleteValue(key)
}

/**
 * Lit un drapeau brut (valeur texte) du stockage local.
 * Aucune logique métier : un simple couple clé/valeur pour les préférences
 * d'interface (ex. guide de première visite déjà affiché).
 * @param {string} key - Clé de stockage (voir STORAGE_KEYS).
 * @returns {string|null} Valeur brute ou null si absente.
 */
export function getFlag(key) {
  if (typeof key !== 'string' || key.trim() === '') return null
  return readValue(key)
}

/**
 * Écrit un drapeau brut dans le stockage local.
 * @param {string} key - Clé de stockage (voir STORAGE_KEYS).
 * @param {string} value - Valeur texte ("1", "true", …).
 * @returns {boolean} true si l'écriture a réussi.
 */
export function setFlag(key, value) {
  if (typeof key !== 'string' || key.trim() === '') return false
  return writeValue(key, String(value))
}

/**
 * Supprime un drapeau brut du stockage local.
 * @param {string} key - Clé de stockage (voir STORAGE_KEYS).
 * @returns {boolean} true si la suppression a réussi.
 */
export function removeFlag(key) {
  if (typeof key !== 'string' || key.trim() === '') return false
  return deleteValue(key)
}

/**
 * Helper booléen : lit un drapeau et le compare à "1" (activé).
 * @param {string} key - Clé de stockage (voir STORAGE_KEYS).
 * @returns {boolean} true si le drapeau vaut "1".
 */
export function isFlagOn(key) {
  return getFlag(key) === '1'
}
