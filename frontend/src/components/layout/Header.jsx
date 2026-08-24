/**
 * ALPHIX V2 — Header
 * Responsive header with logo, brand, user avatar, menu toggle, notifications.
 */

import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from '../ui'
import IconButton from '../ui/IconButton'

/**
 * SVG icon helpers (inline, no external dependencies).
 */
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="5" x2="17" y2="5" />
    <line x1="3" y1="10" x2="17" y2="10" />
    <line x1="3" y1="15" x2="17" y2="15" />
  </svg>
)

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2a5 5 0 0 0-5 5v3l-1.3 1.3A.7.7 0 0 0 4.2 12.5h11.6a.7.7 0 0 0 .5-1.2L15 10V7a5 5 0 0 0-5-5z" />
    <path d="M8 14.7a2 2 0 0 0 4 0" />
  </svg>
)

/**
 * @param {{ user?: object|null }} props
 */
export default function Header({ user }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  return (
    <header className="ax-header">
      <div className="ax-header__left">
        <IconButton
          icon={<MenuIcon />}
          label="Menu"
          className="ax-header__menu-btn"
          onClick={toggleSidebar}
        />
        <Link to={ROUTE_PATHS.HOME} className="ax-header__brand">
          <div className="ax-header__logo" aria-hidden="true">A</div>
          <div className="ax-header__titles">
            <span className="ax-header__name">ALPHIX</span>
            <span className="ax-header__subtitle">Plateforme documentaire universitaire</span>
          </div>
        </Link>
      </div>

      <div className="ax-header__right">
        <IconButton
          icon={<BellIcon />}
          label="Notifications"
          badge={0}
        />
        <Avatar name={user?.name || 'Invite'} size="sm" />
      </div>
    </header>
  )
}
