/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — WelcomeGuide
 * ---------------------------------------------------------------------------
 * Guide de première visite (mobile-first) : beaucoup d'étudiants ne voient pas
 * la barre latérale (☰) et ne savent pas comment naviguer. Ce composant :
 *
 *   1. fait pulser le bouton « trois barres » de l'en-tête (coach-mark) ;
 *   2. propose une carte au-dessus de la barre de navigation :
 *      - « Ouvrir le menu »  → ouvre la sidebar comme un clic sur ☰ ;
 *      - parcours conseillé (Accès à mon cours, ou Connexion si invité) ;
 *      - invitation explicite à créer un compte pour les visiteurs.
 *
 * Garanties d'ergonomie et de robustesse :
 *   - affichage UNE SEULE FOIS par appareil (drapeau localStorage) ;
 *   - non bloquant : la couche est transparente aux clics
 *     (`pointer-events: none`), seule la carte capte le toucher ;
 *   - mobile uniquement (< 768px) : sur desktop la sidebar est déjà visible ;
 *   - disparaît dès l'ouverture du menu, un changement de page, Escape,
 *     un défilement ou après un délai de sécurité ;
 *   - jamais affiché sur les pages de connexion / inscription.
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'
import { STORAGE_KEYS } from '../../constants/api'
import { isFlagOn, setFlag } from '../../utils/storage'
import { useUiStore } from '../../store/uiStore'
import { useAuth } from '../../hooks/useAuth'
import Button from '../ui/Button'

/** Délai d'apparition : laisse la page se peindre avant la sollicitation. */
const SHOW_DELAY_MS = 900

/** Délai de sécurité : la carte se retire seule si l'utilisateur l'ignore. */
const AUTO_HIDE_MS = 30000

/** Défilement (px) au-delà duquel l'utilisateur agit : on retire le guide. */
const SCROLL_HIDE_PX = 60

/** Pages où le guide n'a aucun sens (formulaires d'authentification). */
const SILENT_PATHS = [ROUTE_PATHS.LOGIN, ROUTE_PATHS.REGISTER]

/**
 * Guide d'accueil mobile.
 * @returns {import('react').JSX.Element|null} Carte de guide ou null.
 */
export default function WelcomeGuide() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const openSidebar = useUiStore((s) => s.openSidebar)
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)
  const { isAuthenticated } = useAuth()

  /** L'utilisateur a-t-il déjà vu le guide sur cet appareil ? */
  const [alreadySeen, setAlreadySeen] = useState(() => isFlagOn(STORAGE_KEYS.WELCOME_SEEN))
  /** Le délai d'apparition est-il écoulé ? Page d'armement (null = masqué). */
  const [armedPath, setArmedPath] = useState(null)

  const silenced = SILENT_PATHS.includes(pathname)

  // Le guide s'arme une seule fois, après un court délai.
  useEffect(() => {
    if (alreadySeen || silenced) return undefined

    const timer = setTimeout(() => {
      setFlag(STORAGE_KEYS.WELCOME_SEEN, '1')
      setAlreadySeen(true)
      setArmedPath(pathname)
    }, SHOW_DELAY_MS)

    return () => clearTimeout(timer)
  }, [alreadySeen, silenced, pathname])

  // Visible uniquement sur la page d'armement, sans obstacle, hors sidebar.
  const visible = armedPath !== null && !silenced && !isSidebarOpen && armedPath === pathname

  /** Ferme la carte et ouvre la barre latérale (équivalent du clic sur ☰). */
  const close = useCallback(() => {
    setArmedPath(null)
  }, [])

  /** Navigue vers une destination du parcours guidé. */
  const handleGo = useCallback(
    (to) => {
      close()
      navigate(to)
    },
    [close, navigate],
  )

  /** Ferme la carte puis ouvre la barre latérale (équivalent du clic sur ☰). */
  const handleOpenMenu = useCallback(() => {
    close()
    openSidebar()
  }, [close, openSidebar])

  // Halo lumineux sur le bouton ☰ de l'en-tête (coach-mark).
  useEffect(() => {
    if (!visible) return undefined
    const button = document.querySelector('.ax-header__menu-btn')
    button?.classList.add('ax-header__menu-btn--hint')
    return () => button?.classList.remove('ax-header__menu-btn--hint')
  }, [visible])

  // Retrait automatique : délai de sécurité, Escape, défilement, ou toute
  // interaction hors de la carte (l'utilisateur explore : on s'efface).
  useEffect(() => {
    if (!visible) return undefined

    const timer = setTimeout(close, AUTO_HIDE_MS)
    const onKey = (event) => {
      if (event.key === 'Escape') close()
    }
    const startY = window.scrollY
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > SCROLL_HIDE_PX) close()
    }
    // Capture : ferme avant que le clic n'atteigne la page, sans gêner un
    // appui DANS la carte (boutons du guide toujours fonctionnels).
    const onPointerDown = (event) => {
      if (!event.target?.closest?.('.ax-welcome__card')) close()
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', onScroll)
    }
  }, [visible, close])

  if (!visible) return null

  return (
    <div className="ax-welcome" role="presentation">
      <section
        className="ax-welcome__card"
        role="dialog"
        aria-labelledby="ax-welcome-title"
        aria-describedby="ax-welcome-text"
      >
        <p className="ax-welcome__eyebrow">Nouveau ici ? 👋</p>
        <h2 id="ax-welcome-title" className="ax-welcome__title">
          Tout est dans le menu ☰
        </h2>
        <p id="ax-welcome-text" className="ax-welcome__text">
          Les cours, les documents et vos outils se trouvent dans le menu,
          en haut à gauche. Touchez le bouton ci-dessous pour l&apos;ouvrir.
        </p>

        {!isAuthenticated && (
          <p className="ax-welcome__note">
            💡 Sans compte, vous pouvez déjà explorer. Avec un compte, vous
            téléchargez les documents et retrouvez vos favoris.
          </p>
        )}

        <div className="ax-welcome__actions">
          <Button variant="primary" size="sm" onClick={handleOpenMenu}>
            ☰ Ouvrir le menu
          </Button>

          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={() => handleGo(ROUTE_PATHS.DOCUMENTS)}>
              🎓 Accéder à mon cours
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleGo(ROUTE_PATHS.LOGIN)}>
              🔐 Se connecter
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={close}>
            Plus tard
          </Button>
        </div>

        {!isAuthenticated && (
          <button
            type="button"
            className="ax-welcome__link"
            onClick={() => handleGo(ROUTE_PATHS.REGISTER)}
          >
            Pas encore de compte ? Créer un compte gratuit →
          </button>
        )}
      </section>
    </div>
  )
}