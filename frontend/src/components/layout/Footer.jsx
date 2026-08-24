/**
 * ALPHIX V2 — Footer
 */

import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'

export default function Footer() {
  return (
    <footer className="ax-footer">
      <div className="ax-footer__brand">
        <div className="ax-footer__logo" aria-hidden="true">A</div>
        ALPHIX
      </div>
      <p className="ax-footer__text">
        Plateforme documentaire universitaire du Burundi
      </p>
      <div className="ax-footer__links">
        <Link to={ROUTE_PATHS.HOME} className="ax-footer__link">Accueil</Link>
        <Link to={ROUTE_PATHS.LOGIN} className="ax-footer__link">Connexion</Link>
        <Link to={ROUTE_PATHS.REGISTER} className="ax-footer__link">Inscription</Link>
      </div>
    </footer>
  )
}
