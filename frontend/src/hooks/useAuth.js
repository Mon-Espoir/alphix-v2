/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Hook d'authentification
 * ---------------------------------------------------------------------------
 * Accès typé et sûr au contexte fourni par <AuthProvider>.
 * Échoue explicitement si utilisé hors du Provider (fail-fast).
 */

import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * API d'authentification : { user, status, loading, isAuthenticated,
 * login, logout, refreshUser }.
 *
 * @returns {{
 *   user: object|null,
 *   status: string,
 *   loading: boolean,
 *   isAuthenticated: boolean,
 *   login: (credentials: {email: string, password: string}) => Promise<void>,
 *   logout: () => Promise<void>,
 *   refreshUser: () => Promise<boolean>,
 * }} Contexte d'authentification.
 * @throws {Error} Si le composant n'est pas sous <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.')
  }

  return context
}

export default useAuth
