/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Layout invité (visiteur non connecté)
 * ---------------------------------------------------------------------------
 * Header avec branding ALPHIX + BottomNav (mobile).
 * Sidebar visible sur desktop.
 */

import { Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import Sidebar from '../components/layout/Sidebar'
import BottomNav from '../components/layout/BottomNav'
import Footer from '../components/layout/Footer'

/**
 * Squelette invité avec design system ALPHIX.
 * @returns {import('react').JSX.Element}
 */
export default function GuestLayout() {
  return (
    <div className="app-shell app-shell--guest">
      <Header />
      <Sidebar />

      <main className="app-main app-main--with-nav">
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
    </div>
  )
}
