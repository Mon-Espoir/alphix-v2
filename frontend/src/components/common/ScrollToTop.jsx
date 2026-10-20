/**
 * ALPHIX V2 — ScrollToTop
 * Remet le scroll à zéro à chaque changement de route et libère le
 * verrouillage overflow laissé par un modal ouvert au moment d'une
 * navigation (bug classique Android WebView : plus de défilement).
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * @returns {null}
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
    document.body.style.overflow = ''
  }, [pathname])

  return null
}
