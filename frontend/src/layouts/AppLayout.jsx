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
import ReciprocityPrompt from '../components/documents/ReciprocityPrompt'
import WelcomeGuide from '../components/onboarding/WelcomeGuide'

/**
 * Squelette applicatif avec design system ALPHIX.
 * @returns {import('react').JSX.Element}
 */
export default function AppLayout() {
  return (
    <div className="app-shell app-shell--app">
      <a href="#main-content" className="ax-skip-link">
        Aller au contenu principal
      </a>
      <Header />
      <Sidebar />

      <main id="main-content" tabIndex={-1} className="app-main app-main--sidebar app-main--with-nav">
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
      <ReciprocityPrompt />
      <WelcomeGuide />
    </div>
  )
}
