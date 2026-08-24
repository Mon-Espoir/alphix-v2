/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Bootstrap applicatif
 * ---------------------------------------------------------------------------
 * Point d'entrée React : délègue toute la composition à <AppProviders>
 * (ErrorBoundary > AuthProvider > RouterProvider).
 *
 * Aucune logique ici — voir app/providers/AppProviders.jsx et app/router.jsx.
 */

import AppProviders from './app/providers/AppProviders'

/**
 * Composant racine de l'application.
 * @returns {import('react').JSX.Element}
 */
export default function App() {
  return <AppProviders />
}
