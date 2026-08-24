/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Garde de route publique
 * ---------------------------------------------------------------------------
 * Réservée aux visiteurs NON authentifiés (ex. /login).
 * Un utilisateur déjà connecté est redirigé vers sa destination d'origine
 * (location.state.from, posé par ProtectedRoute) ou vers le tableau de bord.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
} from '../../constants/routes'
import LoadingScreen from '../feedback/LoadingScreen'

/**
 * Garde d'accès invité.
 * @param {{children?: import('react').ReactNode}} props - Contenu optionnel.
 * @returns {import('react').JSX.Element} Enfants, Outlet ou redirection.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Boot en cours : on attend avant de statuer.
  if (loading && !isAuthenticated) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    const intendedPath = location.state?.from?.pathname ?? DEFAULT_AUTHENTICATED_REDIRECT
    return <Navigate to={intendedPath} replace />
  }

  return children ?? <Outlet />
}
