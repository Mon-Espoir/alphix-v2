/**
 * ALPHIX — Sidebar
 * Responsive sidebar: mobile (overlay) / desktop (fixed).
 */

import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'
import { useUiStore } from '../../store/uiStore'
import { useAuth } from '../../hooks/useAuth'
import { hasAdminAccess, hasDelegateAccess } from '../../utils/admin'

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

const AutomationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.5 5.5l1.4 1.4M13.1 13.1l1.4 1.4M14.5 5.5l-1.4 1.4M6.9 13.1l-1.4 1.4" />
    <circle cx="10" cy="10" r="2.5" />
  </svg>
)

const DocumentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2h7l4 4v12H5z" />
    <path d="M12 2v4h4M7.5 10h5M7.5 13h5" />
  </svg>
)

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="17" y2="6" /><circle cx="8" cy="6" r="2" />
    <line x1="3" y1="14" x2="17" y2="14" /><circle cx="13" cy="14" r="2" />
  </svg>
)

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3v10m0 0L6 9m4 4l4-4" />
    <path d="M4 15v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
  </svg>
)

const DelegateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="14" height="12" rx="2" />
    <circle cx="7.5" cy="9" r="1.5" />
    <path d="M5.5 13.5c.5-1.2 1.2-1.8 2-1.8s1.5.6 2 1.8M11 8.5h4M11 11h4" />
  </svg>
)

const NAV_ITEMS = [
  { to: ROUTE_PATHS.HOME, label: 'Accueil', icon: HomeIcon, end: true },
  { to: ROUTE_PATHS.SEARCH, label: 'Recherche', icon: SearchIcon },
  { to: ROUTE_PATHS.DOCUMENTS, label: 'Explorer', icon: DocumentIcon },
  // Groupe academique : Facultes + Departements (navigation liee).
  { section: 'Académique' },
  { to: ROUTE_PATHS.FACULTIES, label: 'Facultes', icon: FacultyIcon },
  { to: ROUTE_PATHS.DEPARTMENTS, label: 'Departements', icon: FacultyIcon },
  { section: 'Espace personnel' },
  { to: ROUTE_PATHS.DOWNLOADS, label: 'Mes Téléchargements', icon: DownloadIcon },
  { to: ROUTE_PATHS.UPLOAD, label: 'Televersement', icon: UploadIcon },
  { to: ROUTE_PATHS.STORAGE, label: 'Stockage', icon: StorageIcon, roles: 'admin' },
  { to: ROUTE_PATHS.AUTOMATION, label: 'Automatisation', icon: AutomationIcon, roles: 'admin' },
  { to: ROUTE_PATHS.DELEGATE, label: 'Espace Délégué', icon: DelegateIcon, roles: 'delegate' },
  { to: ROUTE_PATHS.ADMIN, label: 'Administration', icon: SettingsIcon, roles: 'admin' },
  { to: ROUTE_PATHS.DASHBOARD, label: 'Profil', icon: UserIcon },
  { to: ROUTE_PATHS.ADMIN_SETTINGS, label: 'Parametres', icon: SlidersIcon, roles: 'admin' },
]

export default function Sidebar() {
  const location = useLocation()
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)
  const closeSidebar = useUiStore((s) => s.closeSidebar)
  const { user } = useAuth()
  const showAdmin = hasAdminAccess(user)
  // Espace Délégué : délégués + admins (nomination et supervision).
  const showDelegate = hasDelegateAccess(user) || hasAdminAccess(user)
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.roles === 'admin') return showAdmin
    if (item.roles === 'delegate') return showDelegate
    return true
  })
  const asideRef = useRef(null)
  const prevFocusRef = useRef(null)

  useEffect(() => {
    if (!isSidebarOpen) return undefined
    prevFocusRef.current = document.activeElement
    const aside = asideRef.current
    // Focus first link for accessibility
    const firstLink = aside?.querySelector('a, button')
    // Defer focus to avoid layout thrash
    const t = setTimeout(() => firstLink?.focus(), 0)

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeSidebar()
      }
      if (e.key === 'Tab' && aside) {
        const focusable = aside.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    // Lock scroll on mobile only — prevent background scroll
    const originalOverflow = document.body.style.overflow
    if (window.innerWidth < 768) document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = originalOverflow
      // Return focus to toggle button
      prevFocusRef.current?.focus?.()
    }
  }, [isSidebarOpen, closeSidebar])

  // Auto-close on desktop resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) closeSidebar()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [closeSidebar])

  return (
    <>
      <div
        className={`ax-sidebar__backdrop ${isSidebarOpen ? 'ax-sidebar__backdrop--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        ref={asideRef}
        className={`ax-sidebar ${isSidebarOpen ? 'ax-sidebar--open' : ''}`}
        aria-label="Navigation laterale"
      >
        <div className="ax-sidebar__header">
          <Link to={ROUTE_PATHS.HOME} className="ax-sidebar__brand" onClick={closeSidebar}>
            <div className="ax-sidebar__logo" aria-hidden="true">A</div>
            <span className="ax-sidebar__name">ALPHIX</span>
          </Link>
          <button
            className="ax-icon-btn ax-icon-btn--sm ax-sidebar__close-btn"
            onClick={closeSidebar}
            aria-label="Fermer le menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="ax-sidebar__nav">
          {visibleItems.map((item) => {
            if (item.section) {
              return (
                <p key={`section-${item.section}`} className="ax-sidebar__section" aria-hidden="true">
                  {item.section}
                </p>
              )
            }
            const { to, label, icon: Icon, end } = item
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
          <p className="ax-footer__text">ALPHIX</p>
        </div>
      </aside>
    </>
  )
}
