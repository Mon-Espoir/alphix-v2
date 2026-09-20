/**
 * ALPHIX V2 — Header
 * Responsive header with logo, brand, user avatar, menu toggle, notifications.
 */

import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from '../ui'
import IconButton from '../ui/IconButton'
import NotificationBell from '../notifications/NotificationBell'
import { useAuth } from '../../hooks/useAuth'

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

/**
 * @param {{ user?: object|null }} props
 */
export default function Header({ user: propUser }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)
  const isOnboardingActive = useUiStore((s) => s.isOnboardingActive)
  const { user: authUser } = useAuth()
  const user = propUser ?? authUser

  return (
    <header className="ax-header">
      <div className="ax-header__left">
        <IconButton
          icon={<MenuIcon />}
          label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className={`ax-header__menu-btn${isOnboardingActive ? ' ax-header__menu-btn--nudge' : ''}`}
          onClick={toggleSidebar}
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
          aria-haspopup="true"
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
        <NotificationBell />
        <Link
          to={ROUTE_PATHS.DASHBOARD}
          aria-label={`Aller au profil de ${user?.name || 'Invite'}`}
          title={user?.name || 'Profil'}
          style={{ display: 'inline-flex', borderRadius: '50%' }}
        >
          <Avatar name={user?.name || 'Invite'} size="sm" />
        </Link>
      </div>
    </header>
  )
}
