/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Store de chargement global
 * ---------------------------------------------------------------------------
 * Compteur d'opérations en cours : permet d'afficher un indicateur global
 * tant qu'AU MOINS UNE opération est active, sans écraser les états entre
 * requêtes concurrentes (pattern « compteur de références »).
 */

import { create } from 'zustand'

/**
 * Store de chargement global.
 */
export const useLoadingStore = create((set) => ({
  /** Nombre d'opérations actives. */
  pendingCount: 0,

  /**
   * Déclare le début d'une opération.
   */
  startLoading: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),

  /**
   * Déclare la fin d'une opération. Ne descend jamais sous zéro.
   */
  stopLoading: () => set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
}))

/**
 * Sélecteur dérivé : une opération est-elle en cours ?
 * À passer tel quel à `useLoadingStore(selectIsGlobalLoading)`.
 * @param {{pendingCount: number}} state - État du store.
 * @returns {boolean} true si au moins une opération est active.
 */
export const selectIsGlobalLoading = (state) => state.pendingCount > 0
