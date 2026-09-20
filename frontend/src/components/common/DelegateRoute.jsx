/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Garde de route Espace Délégué
 * ---------------------------------------------------------------------------
 * Vérifie que l'utilisateur est authentifié ET délégué.
 * Affiche un écran explicite en cas de refus plutôt qu'une redirection silencieuse.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { hasAdminAccess, hasDelegateAccess } from '../../utils/admin'
import { ROUTE_PATHS } from '../../constants/routes'
import LoadingScreen from '../feedback/LoadingScreen'

export default function DelegateRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading && !isAuthenticated) return <LoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />
  }

  if (!hasDelegateAccess(user) && !hasAdminAccess(user)) {
    return (
      <div className="ax-container ax-admin-denied" role="alert" aria-live="assertive">
        <div className="ax-card ax-card--padded ax-admin-denied__card">
          <h1 className="ax-admin-denied__title">Accès refusé</h1>
          <p className="ax-admin-denied__text">
            L&apos;Espace Délégué est réservé aux délégués de promotion.
          </p>
          <a href={ROUTE_PATHS.DASHBOARD} className="ax-btn ax-btn--primary ax-btn--md">
            Retour au tableau de bord
          </a>
        </div>
      </div>
    )
  }

  return children
}
