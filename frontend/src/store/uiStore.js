/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Store UI global
 * ---------------------------------------------------------------------------
 * État d'interface transverse : thème, visibilité de la barre latérale.
 * Uniquement des états globaux — aucune logique métier.
 */

import { create } from 'zustand'
import { THEMES } from '../constants/ui'

/**
 * Store d'interface globale.
 */
export const useUiStore = create((set) => ({
  /** Thème courant (voir THEMES). */
  theme: THEMES.SYSTEM,

  /** Visibilité de la barre latérale (mobile first : fermée par défaut). */
  isSidebarOpen: false,

  /**
   * Définit le thème actif.
   * @param {string} theme - Valeur de THEMES.
   */
  setTheme: (theme) => set({ theme }),

  /**
   * Bascule l'ouverture de la barre latérale.
   */
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  /**
   * Ouvre explicitement la barre latérale (parcours guidé, guide d'accueil).
   */
  openSidebar: () => set({ isSidebarOpen: true }),

  /**
   * Ferme explicitement la barre latérale (navigation mobile).
   */
  closeSidebar: () => set({ isSidebarOpen: false }),
}))
