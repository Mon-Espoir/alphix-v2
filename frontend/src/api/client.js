/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Client HTTP Axios central
 * ---------------------------------------------------------------------------
 * Instance unique et partagée de l'application :
 *   - baseURL + timeout + headers issus de `config/api.js` ;
 *   - injection automatique du jeton JWT/Bearer (mode 'token') via interceptor
 *     de requête, avec opt-out par requête (`{ skipAuth: true }`) ;
 *   - normalisation systématique des erreurs (interceptor de réponse) :
 *     tout `catch` applicatif reçoit une `ApiError` typée, jamais un AxiosError.
 *
 * Aucune logique métier ici : transport, authentification mécanique, erreurs.
 */

import axios from 'axios'
import { apiConfig } from '../config/api'
import { getToken } from '../utils/storage'
import { normalizeApiError } from '../utils/apiError'
import { AUTHORIZATION_HEADER, AUTH_BEARER_PREFIX } from '../constants/api'

/**
 * Instance Axios configurée pour toute l'application.
 */
const apiClient = axios.create({
  /** URL de base résolue depuis VITE_API_BASE_URL. */
  baseURL: apiConfig.baseURL,

  /** Timeout global en millisecondes (mobile-first : valeur raisonnable). */
  timeout: apiConfig.timeout,

  /** Headers JSON par défaut (Content-Type, Accept, X-Requested-With). */
  headers: { ...apiConfig.headers },

  /**
   * Transmet les cookies au serveur — requis uniquement pour Sanctum
   * en mode session ('cookie') ; sans effet en mode 'token'.
   */
  withCredentials: apiConfig.withCredentials,
})

/**
 * INTERCEPTOR DE REQUÊTE — authentification JWT/Bearer.
 * Injecte "Authorization: Bearer <token>" si :
 *   - le mode d'authentification est 'token' ;
 *   - un jeton existe dans le storage ;
 *   - la requête n'a pas demandé d'opt-out ({ skipAuth: true }).
 */
apiClient.interceptors.request.use(
  (config) => {
    const shouldAttachToken = apiConfig.useBearer && config.skipAuth !== true

    if (shouldAttachToken) {
      const token = getToken()
      if (token) {
        // L'instance AxiosHeaders expose .set() de manière sûre.
        config.headers?.set(AUTHORIZATION_HEADER, `${AUTH_BEARER_PREFIX}${token}`)
      }
    }

    // FormData (upload de fichiers) : le Content-Type JSON par défaut DOIT être
    // retiré. Sinon axios v1 sérialise le FormData en JSON (formDataToJSON) et
    // le fichier binaire est perdu ({"file":{}} -> 422 "The file field is
    // required."). Le navigateur posera alors lui-même le header
    // multipart/form-data avec le bon boundary.
    if (
      typeof FormData !== 'undefined' &&
      config.data instanceof FormData
    ) {
      config.headers?.set('Content-Type', undefined)
    }

    // Flag interne consommé : ne doit pas fuiter vers l'adaptateur réseau.
    Reflect.deleteProperty(config, 'skipAuth')

    return config
  },
  (error) => Promise.reject(normalizeApiError(error)),
)

/**
 * INTERCEPTOR DE RÉPONSE — normalisation des erreurs.
 * Succès : laissé intact (le dépliage `.data` est du ressort de httpService).
 * Erreur : remplacée par une ApiError typée avant d'atteindre l'appelant.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError = normalizeApiError(error)

    /**
     * DÉCONNEXION GLOBALE SUR 401 — jeton expiré / invalide.
     * On ne purge PAS ici directement (le client ne doit pas connaître le store
     * pour éviter toute dépendance circulaire). On émet un évènement DOM que
     * AuthProvider écoute et qui déclenche `clearAuth()` ; ProtectedRoute se
     * charge ensuite de rediriger vers /login.
     * Garde : seul un 401 portant un jeton (requête authentifiée) déclenche
     * l'évènement — les 401 de /login ou /register (sans jeton) sont laissés
     * aux appelants pour affichage d'erreur.
     */
    if (normalizedError.status === 401 && getToken()) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }

    if (apiConfig.isDev) {
      // Journal de développement : type + statut + cible. JAMAIS de token.
      console.error(
        `[API][${normalizedError.type}]`,
        normalizedError.status ?? '-',
        normalizedError.request?.method ?? '',
        normalizedError.request?.url ?? '',
        `\n${normalizedError.message}`,
      )
    }

    return Promise.reject(normalizedError)
  },
)

export default apiClient
export { apiClient }
