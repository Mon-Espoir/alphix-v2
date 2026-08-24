/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Page 404
 * ---------------------------------------------------------------------------
 * Rendue pour toute route inconnue (path="*").
 */

import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants/routes'
import { Button } from '../components/ui'

/**
 * @returns {import('react').JSX.Element}
 */
export default function NotFoundPage() {
  return (
    <div className="ax-not-found">
      <div className="ax-not-found__code">404</div>
      <h1 className="ax-not-found__title">Page introuvable</h1>
      <p className="ax-not-found__desc">
        La page que vous recherchez nexiste pas ou a ete deplacee.
      </p>
      <Link to={ROUTE_PATHS.HOME}>
        <Button variant="primary" size="lg">Retour a laccueil</Button>
      </Link>
    </div>
  )
}
