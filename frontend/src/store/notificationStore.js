/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Store de notifications global
 * ---------------------------------------------------------------------------
 * File d'attente des notifications transitoires (toasts).
 * Le store ne gère QUE les données : les temporisations d'auto-dismiss
 * relèvent du hook `useNotification` (effets de bord hors du store).
 */

import { create } from 'zustand'
import { NOTIFICATION_TYPES } from '../constants/ui'

/** Compteur local pour identifiants uniques et séquentiels. */
let nextNotificationId = 1

/**
 * Store de notifications.
 * Structure d'une notification : { id, type, message, duration }.
 */
export const useNotificationStore = create((set) => ({
  /** Notifications actives (les plus récentes en fin de liste). */
  notifications: [],

  /**
   * Ajoute une notification.
   * @param {{type?: string, message: string, duration?: number|null}} options
   *   - type     : valeur de NOTIFICATION_TYPES (défaut INFO) ;
   *   - message  : texte affiché ;
   *   - duration : durée avant auto-dismiss ; null = persistante.
   * @returns {number} Identifiant de la notification créée.
   */
  notify: ({ type = NOTIFICATION_TYPES.INFO, message, duration = null }) => {
    const id = nextNotificationId++
    set((state) => ({
      notifications: [...state.notifications, { id, type, message, duration }],
    }))
    return id
  },

  /**
   * Retire une notification par identifiant. Idempotent.
   * @param {number} id - Identifiant à retirer.
   */
  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),

  /**
   * Vide la file complète.
   */
  clearAll: () => set({ notifications: [] }),
}))
