/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Composition des Providers globaux
 * ---------------------------------------------------------------------------
 * Ordre d'imbrication (du plus externe au plus interne) :
 *
 *   1. ErrorBoundary  — dernier rempart contre les erreurs de rendu ;
 *   2. AuthProvider   — session disponible pour TOUTES les routes ;
 *   3. RouterProvider — arbre de routage.
 *
 * Importe les feuilles de styles : theme (design system) + infrastructure.
 */

import { RouterProvider } from 'react-router-dom'
import ErrorBoundary from '../../components/feedback/ErrorBoundary'
import ToastHost from '../../components/feedback/ToastHost'
import AuthProvider from '../../context/AuthProvider'
import { useHardwareBackButton } from '../../hooks/useHardwareBackButton'
import { router } from '../router'
import '../../styles/theme.css'
import '../../styles/infrastructure.css'
import '../../styles/components.css'
import '../../styles/layouts.css'
import '../../styles/pages.css'

/**
 * Racine des providers applicatifs.
 * @returns {import('react').JSX.Element}
 */
export default function AppProviders() {
  // Bouton retour matériel Android : navigue dans l'app au lieu de quitter.
  useHardwareBackButton()
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastHost />
      </AuthProvider>
    </ErrorBoundary>
  )
}
