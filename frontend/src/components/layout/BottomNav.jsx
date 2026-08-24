/**
 * ALPHIX V2 — BottomNav
 * Mobile-only bottom navigation bar.
 */

import { Link, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l9-8 9 8" />
    <path d="M5 8.5V19a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V8.5" />
  </svg>
)

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
)

const DownloadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

const NAV_ITEMS = [
  { to: ROUTE_PATHS.HOME, label: 'Accueil', icon: HomeIcon, end: true },
  { to: '/search', label: 'Recherche', icon: SearchIcon },
  { to: '/downloads', label: 'Telechargements', icon: DownloadIcon },
  { to: ROUTE_PATHS.DASHBOARD, label: 'Profil', icon: UserIcon },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="ax-bottom-nav" aria-label="Navigation principale">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
        const isActive = end
          ? location.pathname === to
          : location.pathname.startsWith(to)

        return (
          <Link
            key={to}
            to={to}
            className={`ax-bottom-nav__item ${isActive ? 'ax-bottom-nav__item--active' : ''}`}
          >
            <span className="ax-bottom-nav__icon"><Icon /></span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
