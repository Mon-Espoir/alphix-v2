/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Store d'authentification (état global + opérations)
 * ---------------------------------------------------------------------------
 * Source de vérité réactive de la session : utilisateur, jeton, statut.
 *
 * Responsabilités :
 *   - CE STORE          : données réactives (user, token, status, isLoading)
 *                         ET opérations asynchrones (login, register, logout,
 *                         refreshUser, initializeAuth) qui mutent cet état ;
 *   - context/AuthProvider : simple pont vers React (expose le store via
 *     useAuth) + écoute l'évènement global de déconnexion 401 ;
 *   - utils/storage.js  : persistance du jeton (NE JAMAIS dupliquer ici).
 *
 * Aucune logique métier : uniquement transport auth + gestion de session.
 */

import { create } from 'zustand'
import { AUTH_STATUS } from '../constants/auth'
import httpService from '../services/httpService'
import { getToken, setToken, removeToken } from '../utils/storage'
import { normalizeApiError, isUnauthorized } from '../utils/apiError'
import { wakeServer } from '../utils/serverWake'
import { API_ENDPOINTS } from '../constants/endpoints'

/**
 * Store d'authentification (Zustand).
 */
export const useAuthStore = create((set, get) => ({
  /** Utilisateur courant (null si déconnecté). */
  user: null,

  /** Jeton JWT courant (mirroir du storage ; null si déconnecté). */
  token: null,

  /** Statut de session courant (voir AUTH_STATUS). */
  status: AUTH_STATUS.IDLE,

  /** Vrai pendant une opération d'auth (boot, login, logout, refresh...). */
  isLoading: false,

  /**
   * Définit l'utilisateur courant.
   * @param {object|null} user - Utilisateur hydraté ou null.
   */
  setUser: (user) => set({ user }),

  /**
   * Définit le jeton courant (état miroir, hors persistance).
   * @param {string|null} token - Jeton brut ou null.
   */
  setToken: (token) => set({ token }),

  /**
   * Définit le statut de session.
   * @param {string} status - Valeur de AUTH_STATUS.
   */
  setStatus: (status) => set({ status }),

  /**
   * Définit l'indicateur de chargement.
   * @param {boolean} isLoading - État de chargement.
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Accesseur dérivé : session valide ?
   * @returns {boolean} true si status === AUTHENTICATED.
   */
  isAuthenticated: () => get().status === AUTH_STATUS.AUTHENTICATED,

  /**
   * Réinitialise entièrement la session (état + jeton persisté).
   * Idempotent : sûr à appeler plusieurs fois.
   */
  clearAuth: () => {
    removeToken()
    set({
      user: null,
      token: null,
      status: AUTH_STATUS.UNAUTHENTICATED,
      isLoading: false,
    })
  },

  /**
   * Restaure la session au démarrage de l'application (auto-login).
   * Si un jeton existe, recharge le profil depuis GET /me.
   * Comportement résilient :
   *   - pas de jeton        -> UNAUTHENTICATED, retour false ;
   *   - succès              -> user hydraté, AUTHENTICATED, retour true ;
   *   - 401                 -> jeton invalide/expiré : purge complète ;
   *   - autre erreur        -> état vidé MAIS jeton conservé pour retry.
   * @returns {Promise<boolean>} true si l'utilisateur est authentifié.
   */
  initializeAuth: async () => {
    const existingToken = getToken()
    if (!existingToken) {
      set({ status: AUTH_STATUS.UNAUTHENTICATED, isLoading: false })
      return false
    }

    set({ token: existingToken, status: AUTH_STATUS.INITIALIZING, isLoading: true })

    try {
      const data = await httpService.get(API_ENDPOINTS.AUTH.ME)
      set({
        user: data?.user ?? null,
        status: AUTH_STATUS.AUTHENTICATED,
        isLoading: false,
      })
      return true
    } catch (rawError) {
      const error = normalizeApiError(rawError)
      // 401 -> token invalide/expiré : on purge tout.
      if (isUnauthorized(error)) {
        removeToken()
        set({ user: null, token: null, status: AUTH_STATUS.UNAUTHENTICATED, isLoading: false })
      } else {
        // Erreur réseau transitoire : on garde le jeton, session non active.
        set({ user: null, status: AUTH_STATUS.UNAUTHENTICATED, isLoading: false })
      }
      return false
    }
  },

  /**
   * Recharge le profil utilisateur depuis le backend (GET /me).
   * @returns {Promise<boolean>} true si l'utilisateur est authentifié.
   */
  refreshUser: async () => {
    if (!getToken()) {
      set({ user: null, status: AUTH_STATUS.UNAUTHENTICATED })
      return false
    }

    set({ isLoading: true })

    try {
      const data = await httpService.get(API_ENDPOINTS.AUTH.ME)
      set({ user: data?.user ?? null, status: AUTH_STATUS.AUTHENTICATED, isLoading: false })
      return true
    } catch (rawError) {
      const error = normalizeApiError(rawError)
      if (isUnauthorized(error)) {
        removeToken()
        set({ user: null, token: null, status: AUTH_STATUS.UNAUTHENTICATED, isLoading: false })
      } else {
        set({ user: null, isLoading: false })
      }
      return false
    }
  },

  /**
   * Connecte l'utilisateur (POST /login).
   * Contrat backend attendu : { message, user, token }.
   * @param {{email: string, password: string}} credentials - Identifiants.
   * @throws {ApiError} Erreur normalisée (validation, identifiants, réseau...).
   */
  login: async (credentials) => {
    set({ status: AUTH_STATUS.LOADING, isLoading: true })
    try {
      // Le backend (Render gratuit) peut dormir : le ping absorbe le cold
      // start AVANT le POST /login pour éviter un timeout à 30 s.
      await wakeServer()
      const data = await httpService.post(API_ENDPOINTS.AUTH.LOGIN, credentials)

      if (!data?.token) {
        throw new Error('Réponse de connexion invalide : jeton manquant.')
      }

      setToken(data.token)
      set({
        user: data?.user ?? null,
        token: data.token,
        status: AUTH_STATUS.AUTHENTICATED,
        isLoading: false,
      })
    } catch (rawError) {
      // Aucune session partielle ne doit subsister après un échec.
      removeToken()
      set({ user: null, token: null, status: AUTH_STATUS.UNAUTHENTICATED, isLoading: false })
      throw normalizeApiError(rawError)
    }
  },

  /**
   * Inscrit et connecte automatiquement l'utilisateur (POST /register).
   * Contrat backend attendu : { message, user, token }.
   * @param {{name: string, email: string, password: string, password_confirmation?: string}} payload - Données d'inscription.
   * @throws {ApiError} Erreur normalisée (validation, email pris, réseau...).
   */
  register: async (payload) => {
    set({ status: AUTH_STATUS.LOADING, isLoading: true })
    try {
      // Même garde anti cold start que pour le login (voir ci-dessus).
      await wakeServer()
      const data = await httpService.post(API_ENDPOINTS.AUTH.REGISTER, payload)

      if (!data?.token) {
        throw new Error('Réponse d’inscription invalide : jeton manquant.')
      }

      setToken(data.token)
      set({
        user: data?.user ?? null,
        token: data.token,
        status: AUTH_STATUS.AUTHENTICATED,
        isLoading: false,
      })
      return data
    } catch (rawError) {
      removeToken()
      set({ user: null, token: null, status: AUTH_STATUS.UNAUTHENTICATED, isLoading: false })
      throw normalizeApiError(rawError)
    }
  },

  /**
   * Déconnecte l'utilisateur (POST /logout puis purge locale).
   * La requête serveur est best-effort : la déconnexion LOCALE est garantie
   * même si le réseau échoue.
   */
  logout: async () => {
    set({ isLoading: true })
    try {
      if (getToken()) {
        await httpService.post(API_ENDPOINTS.AUTH.LOGOUT)
      }
    } catch {
      // Ignoré volontairement : la purge locale prime sur l'erreur serveur.
    } finally {
      removeToken()
      set({ user: null, token: null, status: AUTH_STATUS.UNAUTHENTICATED, isLoading: false })
    }
  },
}))

/** Accès impératif à l'état (hors composants React). */
export const authStore = {
  getState: useAuthStore.getState,
  setState: useAuthStore.setState,
  subscribe: useAuthStore.subscribe,
}