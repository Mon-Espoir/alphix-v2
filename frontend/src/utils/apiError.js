/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Gestion centralisée des erreurs API
 * ---------------------------------------------------------------------------
 * Transforme TOUTES les erreurs réseau (Axios, timeout, annulation, JS)
 * en une structure unique et prévisible : l'objet `ApiError`.
 *
 * Bénéfices d'architecture :
 *   - les couches hautes (features, hooks, UI) ne connaissent JAMAIS Axios ;
 *   - réaction par TYPE (réseau / auth / validation...) plutôt que par code ;
 *   - payload Laravel (message + errors de validation) extrait uniformément.
 *
 * Sécurité : les headers (donc le jeton Bearer) ne sont JAMAIS copiés dans
 * l'erreur normalisée — aucun risque de fuite via logs ou reporting.
 */

import { API_ERROR_TYPES, HTTP_STATUS } from '../constants/api'

/**
 * Erreur API normalisée. Étend Error pour conserver stack + instanceof,
 * tout en transportant un contexte HTTP typé et sûr.
 */
export class ApiError extends Error {
  /**
   * @param {{
   *   type: string,
   *   message: string,
   *   status?: number|null,
   *   code?: string|null,
   *   errors?: Object<string, string[]|string>|null,
   *   request?: {method: string|null, url: string|null} | null,
   *   cause?: unknown,
   * }} params - Description normalisée de l'erreur.
   */
  constructor({ type, message, status = null, code = null, errors = null, request = null, cause = null }) {
    super(message)

    this.name = 'ApiError'
    /** @type {string} Type métier de l'erreur (voir API_ERROR_TYPES). */
    this.type = type
    /** @type {number|null} Statut HTTP si disponible. */
    this.status = status ?? null
    /** @type {string|null} Code technique (ex. ECONNABORTED, ERR_NETWORK). */
    this.code = code ?? null
    /** @type {Object|null} Erreurs de validation champ par champ (Laravel 422). */
    this.errors = errors ?? null
    /** @type {{method: string|null, url: string|null}|null} Cible de la requête (sans headers). */
    this.request = request
    /** @type {string} Horodatage ISO 8601 de la capture. */
    this.timestamp = new Date().toISOString()
    if (cause !== null && cause !== undefined) this.cause = cause

    // Rétablit le prototype après transpilation vers ES5 (cible Capacitor).
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /**
   * Sérialisation sûre (logs, reporting, persistance) : jamais de jeton.
   * @returns {object} Représentation sérialisable de l'erreur.
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      status: this.status,
      code: this.code,
      errors: this.errors,
      request: this.request,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Extrait le message utilisateur depuis un payload Laravel/JSON quelconque.
 * @param {unknown} data - Corps de la réponse (peut être de tout type).
 * @param {string} fallback - Message par défaut si rien d'exploitable.
 * @returns {string} Message lisible.
 */
function extractMessage(data, fallback) {
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim() !== '') {
    return data.message
  }
  if (typeof data === 'string' && data.trim() !== '') return data
  return fallback
}

/**
 * Normalise le mapping d'erreurs de validation Laravel en objet simple.
 * Laravel renvoie soit { champ: ["msg"] } soit un objet "point" imbriqué.
 * @param {unknown} rawErrors - Payload brut du champ `errors`.
 * @returns {Object<string, string[]>|null} Mapping champ -> messages, ou null.
 */
function extractValidationErrors(rawErrors) {
  if (!rawErrors || typeof rawErrors !== 'object') return null

  const normalized = {}
  for (const [field, messages] of Object.entries(rawErrors)) {
    normalized[field] = Array.isArray(messages) ? messages.map(String) : [String(messages)]
  }
  return Object.keys(normalized).length > 0 ? normalized : null
}

/**
 * Construit les métadonnées de requête SENSIBLES-EXEMPTES (sans headers).
 * @param {object|undefined} axiosConfig - Config Axios de la requête échouée.
 * @returns {{method: string|null, url: string|null}|null} Métadonnées ou null.
 */
function extractRequestInfo(axiosConfig) {
  if (!axiosConfig || typeof axiosConfig !== 'object') return null

  const method = typeof axiosConfig.method === 'string' ? axiosConfig.method.toUpperCase() : null
  let url = typeof axiosConfig.url === 'string' ? axiosConfig.url : null

  // Concatène baseURL + url relative pour un diagnostic complet.
  if (url && typeof axiosConfig.baseURL === 'string' && !/^https?:\/\//i.test(url)) {
    url = `${axiosConfig.baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
  }
  return method || url ? { method, url } : null
}

/**
 * Détecte une erreur « ressemblant à » une erreur Axios (sans importer Axios :
 * évite toute dépendance circulaire avec api/client.js).
 * @param {unknown} error - Candidat à inspecter.
 * @returns {boolean} true si l'objet expose la signature Axios.
 */
function isAxiosLikeError(error) {
  return Boolean(error) && typeof error === 'object' && error.isAxiosError === true
}

/**
 * Convertit n'importe quelle erreur en `ApiError` normalisée.
 * Fonction IDEMPOTENTE : passer une ApiError existante la retourne telle quelle.
 *
 * @param {unknown} error - Erreur brute (AxiosError, Error, ApiError, string...).
 * @returns {ApiError} Erreur normalisée, toujours définie.
 */
export function normalizeApiError(error) {
  // Cas 1 — déjà normalisée : idempotence garantie.
  if (error instanceof ApiError) return error

  // Cas 2 — erreur Axios structurée.
  if (isAxiosLikeError(error)) {
    const request = extractRequestInfo(error.config)

    // 2.a — réponse reçue du serveur (statut hors plage 2xx).
    if (error.response) {
      const status = error.response.status ?? null
      const payload = error.response.data
      const validationErrors =
        status === HTTP_STATUS.UNPROCESSABLE_ENTITY ? extractValidationErrors(payload?.errors) : null

      /** Mappe chaque statut vers un type stable de la taxonomie. */
      const statusTypeMap = {
        [HTTP_STATUS.UNAUTHORIZED]: API_ERROR_TYPES.UNAUTHORIZED,
        [HTTP_STATUS.FORBIDDEN]: API_ERROR_TYPES.FORBIDDEN,
        [HTTP_STATUS.NOT_FOUND]: API_ERROR_TYPES.NOT_FOUND,
        [HTTP_STATUS.CONFLICT]: API_ERROR_TYPES.CONFLICT,
        [HTTP_STATUS.UNPROCESSABLE_ENTITY]: API_ERROR_TYPES.VALIDATION,
        [HTTP_STATUS.TOO_MANY_REQUESTS]: API_ERROR_TYPES.RATE_LIMITED,
      }

      const fallbackMessage = {
        [HTTP_STATUS.UNAUTHORIZED]: 'Session expirée ou invalide. Veuillez vous reconnecter.',
        [HTTP_STATUS.FORBIDDEN]: 'Accès refusé : droits insuffisants.',
        [HTTP_STATUS.NOT_FOUND]: 'Ressource introuvable.',
        [API_ERROR_TYPES.VALIDATION]: 'Certaines données sont invalides.',
        [API_ERROR_TYPES.RATE_LIMITED]: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      }

      const type =
        statusTypeMap[status] ??
        (typeof status === 'number' && status >= 500
          ? API_ERROR_TYPES.SERVER
          : API_ERROR_TYPES.CLIENT)

      const message = extractMessage(payload, fallbackMessage[status] ?? fallbackMessage[type] ?? 'Une erreur est survenue.')

      return new ApiError({
        type,
        message,
        status,
        code: typeof payload?.code === 'string' ? payload.code : error.code ?? null,
        errors: validationErrors,
        request,
        cause: error,
      })
    }

    // 2.b — dépassement du délai d'attente.
    if (error.code === 'ECONNABORTED') {
      return new ApiError({
        type: API_ERROR_TYPES.TIMEOUT,
        message: 'Le serveur met trop de temps à répondre. Veuillez réessayer.',
        code: error.code,
        request,
        cause: error,
      })
    }

    // 2.c — annulation volontaire (AbortController).
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({
        type: API_ERROR_TYPES.CANCELLED,
        message: 'Requête annulée.',
        code: error.code,
        request,
        cause: error,
      })
    }

    // 2.d — aucune réponse : réseau injoignable (offline, DNS, CORS...).
    return new ApiError({
      type: API_ERROR_TYPES.NETWORK,
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
      code: error.code ?? null,
      request,
      cause: error,
    })
  }

  // Cas 3 — erreur JavaScript native (ou assimilée).
  if (error instanceof Error) {
    return new ApiError({
      type: API_ERROR_TYPES.UNKNOWN,
      message: error.message || 'Une erreur inattendue est survenue.',
      cause: error,
    })
  }

  // Cas 4 — valeur arbitraire rejetée (string, object, undefined...).
  return new ApiError({
    type: API_ERROR_TYPES.UNKNOWN,
    message: typeof error === 'string' && error.trim() !== '' ? error : 'Une erreur inattendue est survenue.',
    cause: error,
  })
}

/**
 * Lit le type d'une erreur qu'elle soit normalisée ou brute.
 * Tolérante aux erreurs sérialisées/déjà consommées (duck typing).
 * @param {unknown} error - Erreur à inspecter.
 * @returns {string|null} Type connu ou null.
 */
function resolveErrorType(error) {
  if (!error || typeof error !== 'object') return null
  if (error instanceof ApiError) return error.type
  if (isAxiosLikeError(error)) return normalizeApiError(error).type
  return typeof error.type === 'string' ? error.type : null
}

/**
 * Lit le statut HTTP d'une erreur (normalisée OU brute), sans hypothèse.
 * @param {unknown} error - Erreur à inspecter.
 * @returns {number|null} Statut HTTP ou null.
 */
function resolveErrorStatus(error) {
  if (!error || typeof error !== 'object') return null
  if (typeof error.status === 'number') return error.status
  if (isAxiosLikeError(error) && error.response) return error.response.status ?? null
  return null
}

/**
 * Indique si l'erreur est liée au réseau (serveur injoignable, hors-ligne).
 * @param {unknown} error - Erreur normalisée ou brute.
 * @returns {boolean}
 */
export function isNetworkError(error) {
  return resolveErrorType(error) === API_ERROR_TYPES.NETWORK
}

/**
 * Indique si l'erreur correspond à un problème d'authentification (401).
 * Typiquement : déconnexion de l'utilisateur / rafraîchissement requis.
 * @param {unknown} error - Erreur normalisée ou brute.
 * @returns {boolean}
 */
export function isUnauthorized(error) {
  return resolveErrorType(error) === API_ERROR_TYPES.UNAUTHORIZED || resolveErrorStatus(error) === HTTP_STATUS.UNAUTHORIZED
}

/**
 * Indique si l'erreur correspond à un refus d'autorisation (403).
 * L'utilisateur est authentifié mais ses droits sont insuffisants.
 * @param {unknown} error - Erreur normalisée ou brute.
 * @returns {boolean}
 */
export function isForbidden(error) {
  return resolveErrorType(error) === API_ERROR_TYPES.FORBIDDEN || resolveErrorStatus(error) === HTTP_STATUS.FORBIDDEN
}

/**
 * Indique si l'erreur provient d'une défaillance serveur (statut >= 500).
 * @param {unknown} error - Erreur normalisée ou brute.
 * @returns {boolean}
 */
export function isServerError(error) {
  const status = resolveErrorStatus(error)
  return (
    resolveErrorType(error) === API_ERROR_TYPES.SERVER ||
    (typeof status === 'number' && status >= 500)
  )
}

/**
 * Garde de type : vérifie qu'une valeur est une ApiError normalisée.
 * @param {unknown} error - Valeur à tester.
 * @returns {boolean} true s'il s'agit d'une instance d'ApiError.
 */
export function isApiError(error) {
  return error instanceof ApiError
}
