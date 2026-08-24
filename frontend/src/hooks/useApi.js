/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Hook générique d'appel API
 * ---------------------------------------------------------------------------
 * Encapsule le cycle de vie d'une requête asynchrone (data / error /
 * isLoading) autour du contrat établi par httpService : les erreurs
 * reçues sont déjà des ApiError normalisées.
 *
 * Aucune connaissance métier : la fonction de requête est fournie
 * par l'appelant (features/*).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeApiError } from '../utils/apiError'

/**
 * État initial du hook.
 */
const INITIAL_STATE = Object.freeze({ data: null, error: null, isLoading: false })

/**
 * Hook d'exécution de requêtes API.
 *
 * @template T
 * @param {((...args: any[]) => Promise<T>)|null} requestFn
 *   Fonction de requête (ex. () => httpService.get('/me')).
 *   Peut être null (requête définie plus tard via execute()).
 * @returns {{
 *   data: T|null,
 *   error: import('../utils/apiError').ApiError|null,
 *   isLoading: boolean,
 *   execute: (...args: any[]) => Promise<T|undefined>,
 *   reset: () => void,
 * }} État courant + déclencheur impératif.
 *
 * Contrat de `execute(...args)` :
 *   - succès    -> retourne les données ;
 *   - échec     -> stocke l'ApiError normalisée et retourne undefined
 *                  (NE relance PAS l'exception : évite les unhandled
 *                  rejections quand l'appelant n'écoute pas).
 */
export function useApi(requestFn = null) {
  const [state, setState] = useState(INITIAL_STATE)

  /** Garde-fou contre les mises à jour après démontage du composant. */
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  /**
   * Exécute la fonction de requête avec suivi d'état.
   * @param {...any} args - Arguments transmis à requestFn.
   * @returns {Promise<T|undefined>} Données ou undefined en cas d'échec.
   */
  const execute = useCallback(
    async (...args) => {
      setState({ data: null, error: null, isLoading: true })

      try {
        if (typeof requestFn !== 'function') {
          throw new Error('useApi : aucune fonction de requête fournie.')
        }

        const data = await requestFn(...args)

        if (isMountedRef.current) {
          setState({ data, error: null, isLoading: false })
        }
        return data
      } catch (rawError) {
        // Idempotence : une erreur déjà normalisée n'est pas re-traitée.
        const error = normalizeApiError(rawError)

        if (isMountedRef.current) {
          setState({ data: null, error, isLoading: false })
        }
        return undefined
      }
    },
    [requestFn],
  )

  /**
   * Réinitialise l'état local du hook.
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return { ...state, execute, reset }
}

export default useApi
