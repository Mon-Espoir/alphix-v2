/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Provider d'authentification (Sanctum + Bearer Token)
 * ---------------------------------------------------------------------------
 * Pont entre le store d'authentification (Zustand) et l'arbre React.
 *
 * Responsabilités (minimales, non métier) :
 *   - exposer l'état + les actions du store via le contexte useAuth() ;
 *   - déclencher `initializeAuth()` au montage (restauration de session /
 *     auto-login) ;
 *   - écouter l'évènement global `auth:unauthorized` (émis par le client Axios
 *     sur un 401 avec jeton) et purger la session ; ProtectedRoute se charge
 *     alors de rediriger vers /login.
 *
 * Consomme EXCLUSIVEMENT :
 *   - `store/authStore` (source de vérité) ;
 *   - `constants/auth` (statuts).
 *
 * API exposée via useAuth() :
 *   - user, token, status, loading, isAuthenticated,
 *   - login, register, logout, refreshUser, initializeAuth, clearAuth.
 */

import { useEffect, useMemo } from 'react'
import { AuthContext } from './AuthContext'
import { useAuthStore } from '../store/authStore'
import { AUTH_STATUS } from '../constants/auth'

/** Nom de l'évènement global déclenché par le client Axios sur 401. */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

/**
 * Fournit l'API d'authentification à toute l'application.
 * @param {{children: import('react').ReactNode}} props - Enfants englobés.
 * @returns {import('react').JSX.Element} Sous-arbre contextualisé.
 */
export default function AuthProvider({ children }) {
  // Sélecteurs primitifs (Zustand v5) — références d'actions stables.
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const status = useAuthStore((state) => state.status)
  const isLoading = useAuthStore((state) => state.isLoading)
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const logout = useAuthStore((state) => state.logout)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  /** Session valide. */
  const isAuthenticated = status === AUTH_STATUS.AUTHENTICATED

  /**
   * Restauration de session au démarrage (auto-login si jeton présent).
   */
  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  /**
   * Écoute la déconnexion globale déclenchée par un 401 (jeton expiré/invalide).
   * La purge ici fait basculer isAuthenticated à false ; ProtectedRoute
   * redirige automatiquement vers /login.
   */
  useEffect(() => {
    const handleUnauthorized = () => clearAuth()
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [clearAuth])

  // --- Valeur mémoïsée du contexte ------------------------------------------
  const value = useMemo(() => {
    return {
      user,
      token,
      status,
      loading: isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      refreshUser,
      initializeAuth,
      clearAuth,
    }
  }, [
    user,
    token,
    status,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    initializeAuth,
    clearAuth,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}