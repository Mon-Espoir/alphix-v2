/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Hook de notifications
 * ---------------------------------------------------------------------------
 * API de haut niveau au-dessus de `notificationStore` : helpers typés
 * (success, error, info, warning) + auto-dismiss temporisé.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import { NOTIFICATION_TYPES, NOTIFICATION_DEFAULT_DURATION_MS } from '../constants/ui'

/**
 * API de notification.
 *
 * @returns {{
 *   show: (options: {type?: string, message: string, duration?: number|null}) => number,
 *   success: (message: string, options?: object) => number,
 *   error: (message: string, options?: object) => number,
 *   info: (message: string, options?: object) => number,
 *   warning: (message: string, options?: object) => number,
 *   dismiss: (id: number) => void,
 *   clearAll: () => void,
 * }} Fonctions d'émission et de gestion.
 */
export function useNotification() {
  const notify = useNotificationStore((state) => state.notify)
  const dismiss = useNotificationStore((state) => state.dismiss)
  const clearAll = useNotificationStore((state) => state.clearAll)

  /** Timers d'auto-dismiss actifs (nettoyés au démontage du consommateur). */
  const timersRef = useRef(new Map())

  /** Nettoie TOUS les timers au démontage. */
  const timers = timersRef.current
  useEffect(() => {
    return () => {
      for (const timerId of timers.values()) clearTimeout(timerId)
      timers.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref stable, exécuté une seule fois
  }, [])

  /**
   * Émet une notification générique avec auto-dismiss optionnel.
   * @param {{type?: string, message: string, duration?: number|null}} options
   * @returns {number} Identifiant de la notification.
   */
  const show = useCallback(
    ({ type = NOTIFICATION_TYPES.INFO, message, duration = NOTIFICATION_DEFAULT_DURATION_MS }) => {
      const id = notify({ type, message, duration })

      if (typeof duration === 'number' && duration > 0) {
        const timerId = setTimeout(() => {
          dismiss(id)
          timers.delete(id)
        }, duration)
        timers.set(id, timerId)
      }

      return id
    },
    [dismiss, notify, timers],
  )

  /**
   * Helpers typés — fonctions inline (exigence react-hooks v7).
   */
  const success = useCallback(
    (message, options = {}) => show({ ...options, type: NOTIFICATION_TYPES.SUCCESS, message }),
    [show],
  )
  const error = useCallback(
    (message, options = {}) => show({ ...options, type: NOTIFICATION_TYPES.ERROR, message }),
    [show],
  )
  const info = useCallback(
    (message, options = {}) => show({ ...options, type: NOTIFICATION_TYPES.INFO, message }),
    [show],
  )
  const warning = useCallback(
    (message, options = {}) => show({ ...options, type: NOTIFICATION_TYPES.WARNING, message }),
    [show],
  )

  return {
    show,
    success,
    error,
    info,
    warning,
    dismiss,
    clearAll,
  }
}

export default useNotification
