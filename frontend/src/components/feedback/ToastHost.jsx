/**
 * ALPHIX V2 — ToastHost
 * Affichage des notifications transitoires du store global.
 * Ancrage haut centré, sous la barre de statut (safe-area), z-index toast.
 * Un clic n'importe où sur le toast le ferme.
 */

import { useNotificationStore } from '../../store/notificationStore'
import { NOTIFICATION_TYPES } from '../../constants/ui'

const VARIANT_CLASS = {
  [NOTIFICATION_TYPES.SUCCESS]: 'ax-toast--success',
  [NOTIFICATION_TYPES.ERROR]: 'ax-toast--error',
  [NOTIFICATION_TYPES.WARNING]: 'ax-toast--warning',
  [NOTIFICATION_TYPES.INFO]: 'ax-toast--info',
}

/**
 * @returns {import('react').JSX.Element|null}
 */
export default function ToastHost() {
  const notifications = useNotificationStore((state) => state.notifications)
  const dismiss = useNotificationStore((state) => state.dismiss)

  if (!notifications || notifications.length === 0) return null

  return (
    <div className="ax-toast-host" role="status" aria-live="polite" aria-label="Notifications">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          type="button"
          className={['ax-toast', VARIANT_CLASS[notification.type] || ''].filter(Boolean).join(' ')}
          onClick={() => dismiss(notification.id)}
        >
          {notification.message}
        </button>
      ))}
    </div>
  )
}
