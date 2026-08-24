/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Hook de chargement global
 * ---------------------------------------------------------------------------
 * Pont ergonomique entre les composants et `loadingStore` (compteur
 * d'opérations concurrentes).
 */

import { useCallback } from 'react'
import { useLoadingStore, selectIsGlobalLoading } from '../store/loadingStore'

/**
 * API de chargement global.
 *
 * @returns {{
 *   isLoading: boolean,
 *   startLoading: () => void,
 *   stopLoading: () => void,
 *   withLoading: <T>(task: () => Promise<T>) => Promise<T|undefined>,
 * }} État global + utilitaires.
 *
 * `withLoading(task)` encadre une tâche asynchrone : compteur incrémenté
 * au départ, décrémenté en succès comme en erreur (bloc finally).
 */
export function useLoading() {
  const isLoading = useLoadingStore(selectIsGlobalLoading)
  const startLoading = useLoadingStore((state) => state.startLoading)
  const stopLoading = useLoadingStore((state) => state.stopLoading)

  const withLoading = useCallback(
    async (task) => {
      if (typeof task !== 'function') return undefined

      startLoading()
      try {
        // La propagation d'erreur est préservée : la gestion reste
        // du ressort de l'appelant ; le compteur est toujours décrémenté.
        return await task()
      } finally {
        stopLoading()
      }
    },
    [startLoading, stopLoading],
  )

  return { isLoading, startLoading, stopLoading, withLoading }
}

export default useLoading
