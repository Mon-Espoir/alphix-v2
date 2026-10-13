/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Bouton retour matériel (Android)
 * ---------------------------------------------------------------------------
 * Sans ce pont, le bouton retour du téléphone IGNORE l'historique du
 * routeur React (navigations pushState invisibles pour la WebView) et
 * QUITTE l'application au lieu de revenir en arrière.
 *
 * Comportement installé UNE fois au démarrage :
 *   - s'il existe une page précédente dans l'historique applicatif
 *     (index React Router > 0) → on revient en arrière ;
 *   - sinon (accueil ou lancement direct) → on quitte proprement.
 *
 * Sur le web, l'écouteur ne se déclenche jamais : aucun effet.
 */

import { useEffect } from 'react'
import { ROUTE_PATHS } from '../constants/routes'

/** Chemin d'accueil : un retour ici quitte l'application. */
const HOME_PATH = ROUTE_PATHS.HOME

/**
 * Installe le gestionnaire du bouton retour matériel (natif uniquement).
 * @returns {void}
 */
export function useHardwareBackButton() {
  useEffect(() => {
    let listener = null
    let cancelled = false

    async function attach() {
      try {
        const { App } = await import('@capacitor/app')
        if (cancelled) return
        listener = await App.addListener('backButton', () => {
          // Index d'historique tenu par React Router (BrowserRouter).
          const historyIndex = window?.history?.state?.idx
          const canGoBack = typeof historyIndex === 'number'
            ? historyIndex > 0
            : window.location.pathname !== HOME_PATH
          if (canGoBack) {
            window.history.back()
          } else {
            App.exitApp()
          }
        })
      } catch {
        // Pas de pont natif (web / tests) : rien à installer.
        listener = null
      }
    }

    attach()
    return () => {
      cancelled = true
      if (listener) listener.remove().catch(() => {})
    }
  }, [])
}
