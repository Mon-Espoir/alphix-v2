/**
 * ---------------------------------------------------------------------------
 * ALPHIX — Configuration d'environnement centrale
 * ---------------------------------------------------------------------------
 * Point d'accès UNIQUE aux variables d'environnement Vite (`import.meta.env`).
 *
 * Règle d'architecture : aucun autre module ne doit lire `import.meta.env`
 * directement. Tout passe par l'objet figé `ENV` exporté ici, ce qui garantit :
 *   - une seule source de vérité,
 *   - une validation / normalisation centralisée,
 *   - des valeurs de repli explicites (build Capacitor jamais cassé).
 *
 * Aucune logique métier : lecture, normalisation, replis.
 */

/**
 * Valeurs par défaut applicatives (utilisées si la variable env est absente).
 * @type {Readonly<{API_BASE_URL: string, API_TIMEOUT_MS: number, APP_NAME: string, AUTH_MODE: string}>}
 */
const DEFAULTS = Object.freeze({
  API_BASE_URL: 'https://alphix-backend.onrender.com/api/v1',
  API_TIMEOUT_MS: 15000,
  APP_NAME: 'ALPHIX',
  AUTH_MODE: 'token',
})

/**
 * Modes d'authentification supportés par le socle technique.
 * - 'token'  : JWT/Bearer stocké côté client (mobile-first, Capacitor).
 * - 'cookie' : session stateful Laravel Sanctum (web).
 * @type {readonly string[]}
 */
const SUPPORTED_AUTH_MODES = Object.freeze(['token', 'cookie'])

/** Indique si l'on tourne en mode développement Vite. */
const IS_DEV = Boolean(import.meta.env?.DEV)

/**
 * Lit une variable d'environnement brute et retourne undefined si absente/vide.
 * @param {string} key - Nom de la variable (ex. 'VITE_API_BASE_URL').
 * @returns {string|undefined} Valeur brute nettoyée ou undefined.
 */
function readRawEnv(key) {
  const value = import.meta.env?.[key]
  if (value === undefined || value === null) return undefined

  const trimmed = String(value).trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Lit une variable d'environnement chaîne de caractères avec repli.
 * @param {string} key - Nom de la variable.
 * @param {string} fallback - Valeur par défaut.
 * @returns {string} Valeur résolue.
 */
function readStringEnv(key, fallback) {
  return readRawEnv(key) ?? fallback
}

/**
 * Lit une variable d'environnement entière avec repli et borne minimale.
 * @param {string} key - Nom de la variable.
 * @param {number} fallback - Valeur par défaut.
 * @param {{min?: number}} [options] - Bornes de validation.
 * @returns {number} Entier validé ou valeur de repli.
 */
function readIntEnv(key, fallback, { min = 0 } = {}) {
  const parsed = Number.parseInt(readRawEnv(key) ?? '', 10)
  if (Number.isNaN(parsed)) return fallback
  return parsed < min ? fallback : parsed
}

/**
 * Supprime les slashs terminaux d'une URL pour éviter les doubles slashs
 * lors des concaténations avec les chemins de endpoints.
 * @param {string} url - URL à normaliser.
 * @returns {string} URL sans slash terminal.
 */
function normalizeBaseUrl(url) {
  return String(url).replace(/\/+$/, '')
}

/**
 * Valide et résout le mode d'authentification.
 * Retombe silencieusement sur le mode par défaut si la valeur est inconnue.
 * @param {string} rawMode - Mode brut issu de l'environnement.
 * @returns {'token'|'cookie'} Mode validé.
 */
function resolveAuthMode(rawMode) {
  const candidate = String(rawMode ?? '').toLowerCase()
  if (SUPPORTED_AUTH_MODES.includes(candidate)) return candidate

  if (readRawEnv('VITE_AUTH_MODE') !== undefined && IS_DEV) {
    console.warn(
      `[ENV] VITE_AUTH_MODE invalide (« ${rawMode} »). ` +
        `Valeurs acceptées : ${SUPPORTED_AUTH_MODES.join(', ')}. Repli sur « ${DEFAULTS.AUTH_MODE} ».`,
    )
  }
  return DEFAULTS.AUTH_MODE
}

// --- Avertissements de configuration (mode développement uniquement) -------
if (IS_DEV && readRawEnv('VITE_API_BASE_URL') === undefined) {
  console.warn(`[ENV] VITE_API_BASE_URL absente — utilisation du repli : ${DEFAULTS.API_BASE_URL}`)
}

/**
 * Configuration d'environnement résolue et gelée.
 * Objet plat, sérialisable, consommé par toute l'application.
 */
export const ENV = Object.freeze({
  /** URL de base de l'API Laravel (sans slash terminal). */
  API_BASE_URL: normalizeBaseUrl(readStringEnv('VITE_API_BASE_URL', DEFAULTS.API_BASE_URL)),

  /** Timeout global des requêtes HTTP en millisecondes. */
  API_TIMEOUT_MS: readIntEnv('VITE_API_TIMEOUT_MS', DEFAULTS.API_TIMEOUT_MS, { min: 1000 }),

  /** Nom affichable de l'application. */
  APP_NAME: readStringEnv('VITE_APP_NAME', DEFAULTS.APP_NAME),

  /** Mode d'authentification : 'token' (JWT/Bearer) ou 'cookie' (Sanctum). */
  AUTH_MODE: resolveAuthMode(readStringEnv('VITE_AUTH_MODE', DEFAULTS.AUTH_MODE)),

  /** Environnement d'exécution Vite ('development', 'production', ...). */
  APP_ENV: readStringEnv('MODE', 'development'),

  /** Raccourcis de lecture pour les branches d'exécution. */
  IS_DEV,
  IS_PROD: Boolean(import.meta.env?.PROD),
})

export default ENV
