/**
 * ALPHIX V2 — Sidebar
 * Responsive sidebar: mobile (overlay) / desktop (fixed).
 */

import { Link, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'
import { useUiStore } from '../../store/uiStore'

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l7-7 7 7" />
    <path d="M5 8.5V16a1 1 0 0 0 1 1h3v-4h2v4h3a1 1 0 0 0 1-1V8.5" />
  </svg>
)

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="9" cy="9" r="6" />
    <line x1="13.5" y1="13.5" x2="17" y2="17" />
  </svg>
)

const FacultyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h14M3 10h14M5 6l5-3 5 3" />
    <path d="M4 10v11M8 10v11M12 10v11M16 10v11" />
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3" />
    <path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" />
  </svg>
)

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <path d="M10 4v12m0 0l-4-4m4 4l4-4" />
  </svg>
)

const StorageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M4 12h16" />
  </svg>
)

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="2.5" />
    <path d="M16.2 12.2a1.4 1.4 0 0 0 .3 1.5l.1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.4 1.4 0 0 0-1.5-.3 1.4 1.4 0 0 0-.8 1.3v.2a1.7 1.7 0 0 1-3.4 0v-.1a1.4 1.4 0 0 0-.9-1.3 1.4 1.4 0 0 0-1.5.3l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.4 1.4 0 0 0 .3-1.5 1.4 1.4 0 0 0-1.3-.8h-.2a1.7 1.7 0 0 1 0-3.4h.1a1.4 1.4 0 0 0 1.3-.9 1.4 1.4 0 0 0-.3-1.5l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.4 1.4 0 0 0 1.5.3h.1a1.4 1.4 0 0 0 .8-1.3v-.2a1.7 1.7 0 0 1 3.4 0v.1a1.4 1.4 0 0 0 .8 1.3 1.4 1.4 0 0 0 1.5-.3l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.4 1.4 0 0 0-.3 1.5v.1a1.4 1.4 0 0 0 1.3.8h.2a1.7 1.7 0 0 1 0 3.4h-.1a1.4 1.4 0 0 0-1.3.8z" />
  </svg>
)

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="5" y1="5" x2="15" y2="15" />
    <line x1="15" y1="5" x2="5" y2="15" />
  </svg>
)

const NAV_ITEMS = [
  { to: ROUTE_PATHS.HOME, label: 'Accueil', icon: HomeIcon, end: true },
  { to: '/search', label: 'Recherche', icon: SearchIcon },
  { to: ROUTE_PATHS.FACULTIES, label: 'Facultes', icon: FacultyIcon },
  { to: ROUTE_PATHS.UPLOAD, label: 'Televersement', icon: UploadIcon },
  { to: ROUTE_PATHS.STORAGE, label: 'Stockage', icon: StorageIcon },
  { to: ROUTE_PATHS.ADMIN, label: 'Administration', icon: SettingsIcon },
  { to: ROUTE_PATHS.DASHBOARD, label: 'Profil', icon: UserIcon },
  { to: '/settings', label: 'Parametres', icon: SettingsIcon },
]

export default function Sidebar() {
  const location = useLocation()
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)
  const closeSidebar = useUiStore((s) => s.closeSidebar)

  return (
    <>
      <div
        className={`ax-sidebar__backdrop ${isSidebarOpen ? 'ax-sidebar__backdrop--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside className={`ax-sidebar ${isSidebarOpen ? 'ax-sidebar--open' : ''}`} aria-label="Navigation laterale">
        <div className="ax-sidebar__header">
          <Link to={ROUTE_PATHS.HOME} className="ax-sidebar__brand" onClick={closeSidebar}>
            <div className="ax-sidebar__logo" aria-hidden="true">A</div>
            <span className="ax-sidebar__name">ALPHIX</span>
          </Link>
          <button
            className="ax-icon-btn ax-icon-btn--sm"
            onClick={closeSidebar}
            aria-label="Fermer le menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="ax-sidebar__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const isActive = end
              ? location.pathname === to
              : location.pathname.startsWith(to)

            return (
              <Link
                key={to}
                to={to}
                className={`ax-sidebar__link ${isActive ? 'ax-sidebar__link--active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="ax-sidebar__link-icon"><Icon /></span>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ax-sidebar__footer">
          <p className="ax-footer__text">ALPHIX V2</p>
        </div>
      </aside>
    </>
  )
}
