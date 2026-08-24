/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Garde de route protégée
 * ---------------------------------------------------------------------------
 * Restreint l'accès aux utilisateurs authentifiés.
 * Deux modes d'usage :
 *   - wrapper      : <ProtectedRoute><MaPage/></ProtectedRoute> ;
 *   - layout route : <ProtectedRoute/> seul, enfants rendus via <Outlet/>.
 *
 * Pendant la restauration de session au boot, affiche <LoadingScreen/>
 * plutôt que de rediriger (évite le « flash » vers /login).
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTE_PATHS } from '../../constants/routes'
import LoadingScreen from '../feedback/LoadingScreen'

/**
 * Garde d'accès authentifié.
 * @param {{children?: import('react').ReactNode}} props - Contenu protégé optionnel.
 * @returns {import('react').JSX.Element} Enfants, Outlet ou redirection.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Boot en cours : on attend la résolution de session.
  if (loading && !isAuthenticated) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTE_PATHS.LOGIN}
        replace
        state={{ from: location }}
      />
    )
  }

  return children ?? <Outlet />
}
