/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Layout Administration
 * ---------------------------------------------------------------------------
 * Enveloppe commune aux pages /admin/* : Header + navigation latérale admin
 * + zone principale <Outlet /> + BottomNav. Réutilise le squelette visuel
 * d'AppLayout mais avec une navigation dédiée.
 */

import { NavLink, Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import Sidebar from '../components/layout/Sidebar'
import BottomNav from '../components/layout/BottomNav'
import Footer from '../components/layout/Footer'
import { ROUTE_PATHS } from '../constants/routes'

const ADMIN_NAV = [
  { to: ROUTE_PATHS.ADMIN, label: 'Tableau de bord', end: true },
  { to: ROUTE_PATHS.ADMIN_USERS, label: 'Utilisateurs' },
  { to: ROUTE_PATHS.ADMIN_DOCUMENTS, label: 'Documents' },
  { to: ROUTE_PATHS.ADMIN_FACULTIES, label: 'Facultés' },
  { to: ROUTE_PATHS.ADMIN_DEPARTMENTS, label: 'Départements' },
  { to: ROUTE_PATHS.ADMIN_COURSES, label: 'Cours' },
  { to: ROUTE_PATHS.ADMIN_STORAGE, label: 'Stockage' },
  { to: ROUTE_PATHS.ADMIN_STATISTICS, label: 'Statistiques' },
  { to: ROUTE_PATHS.ADMIN_LOGS, label: 'Journaux' },
  { to: ROUTE_PATHS.ADMIN_SETTINGS, label: 'Paramètres' },
]

export default function AdminLayout() {
  return (
    <div className="app-shell app-shell--admin">
      <a href="#admin-main" className="ax-skip-link">
        Aller au contenu principal
      </a>
      <Header />
      <Sidebar />

      {/* Barre secondaire d'administration - ancrée sous le header */}
      <nav className="ax-admin-nav" aria-label="Navigation administration">
        <div className="ax-admin-nav__inner">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                ['ax-admin-nav__link', isActive && 'ax-admin-nav__link--active'].filter(Boolean).join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="app-main app-main--sidebar app-main--with-nav ax-admin-main" id="admin-main" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
    </div>
  )
}
