/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Layout applicatif (utilisateur connecté)
 * ---------------------------------------------------------------------------
 * Header avec branding ALPHIX + Sidebar desktop + BottomNav mobile.
 */

import { Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import Sidebar from '../components/layout/Sidebar'
import BottomNav from '../components/layout/BottomNav'
import Footer from '../components/layout/Footer'

/**
 * Squelette applicatif avec design system ALPHIX.
 * @returns {import('react').JSX.Element}
 */
export default function AppLayout() {
  return (
    <div className="app-shell app-shell--app">
      <Header />
      <Sidebar />

      <main className="app-main app-main--sidebar app-main--with-nav">
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
    </div>
  )
}
