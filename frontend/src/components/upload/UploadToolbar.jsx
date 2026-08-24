/**
 * ALPHIX V2 — UploadToolbar
 * Barre d'outils contextuelle pour les pages Upload/Historique/Stockage.
 * Affiche compteurs, filtres rapides et actions globales.
 */

import { useCallback } from 'react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { UPLOAD_ITEM_STATUS, UPLOAD_STATUS_BADGES } from '../../constants/upload'
import { useNotification } from '../../hooks/useNotification'

const PAUSE_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="4" width="3" height="12" /><rect x="12" y="4" width="3" height="12" /></svg>
)
const PLAY_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4v12l10-6-10-6z" /></svg>
)
const TRASH_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l8 8M14 6l-8 8" /></svg>
)
const REFRESH_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12a8 8 0 0 1 11.3-7.1M20 12v4h-4" /></svg>
)

/**
 * @param {object} props
 * @param {object} props.counts - {total, pending, uploading, uploaded, failed, cancelled, duplicates}
 * @param {boolean} props.isPaused - File en pause.
 * @param {function(): void} [props.onPause] - Pause file.
 * @param {function(): void} [props.onResume] - Reprise file.
 * @param {function(): void} [props.onClearCompleted] - Purge terminees.
 * @param {function(): void} [props.onPurgeFailed] - Purge echecs.
 * @param {function(): void} [props.onRefresh] - Actualiser (stockage).
 * @param {string} [props.variant='upload'] - 'upload' | 'history' | 'storage'
 * @param {string} [props.className]
 */
export default function UploadToolbar({
  counts,
  isPaused,
  onPause,
  onResume,
  onClearCompleted,
  onPurgeFailed,
  onRefresh,
  variant = 'upload',
  className = '',
}) {
  const notify = useNotification()

  const handlePurgeFailed = useCallback(() => {
    if (!onPurgeFailed) return
    if (window.confirm('Supprimer tous les envois en echec ?')) {
      onPurgeFailed()
      notify.success('Envois en echec purges.')
    }
  }, [onPurgeFailed, notify])

  const getVariant = (status) => UPLOAD_STATUS_BADGES[status] || 'default'

  const statusBadges = [
    { key: UPLOAD_ITEM_STATUS.UPLOADING, label: 'En cours' },
    { key: UPLOAD_ITEM_STATUS.PENDING, label: 'En attente' },
    { key: UPLOAD_ITEM_STATUS.UPLOADED, label: 'Envoyes' },
    { key: UPLOAD_ITEM_STATUS.FAILED, label: 'Echecs' },
    { key: UPLOAD_ITEM_STATUS.CANCELLED, label: 'Annules' },
    { key: UPLOAD_ITEM_STATUS.AWAITING_DECISION, label: 'Doublons' },
  ]

  return (
    <div className={['ax-upload-toolbar', `ax-upload-toolbar--${variant}`, className].filter(Boolean).join(' ')}>
      {/* Compteurs par statut */}
      <div className="ax-upload-toolbar__counts" role="status" aria-live="polite">
        {statusBadges.map(({ key, label }) => {
          const count = counts[key] ?? 0
          if (count === 0 && key !== UPLOAD_ITEM_STATUS.UPLOADING) return null
          return (
            <span key={key} className="ax-upload-toolbar__count-item">
              <Badge variant={getVariant(key)} size="sm">{count}</Badge>
              <span className="ax-upload-toolbar__count-label">{label}</span>
            </span>
          )
        })}
        {counts.total > 0 && (
          <span className="ax-upload-toolbar__count-item ax-upload-toolbar__count-item--total">
            <Badge variant="default" size="sm">{counts.total}</Badge>
            <span className="ax-upload-toolbar__count-label">Total</span>
          </span>
        )}
      </div>

      {/* Actions globales */}
      <div className="ax-upload-toolbar__actions">
        {variant === 'upload' && (
          <>
            {isPaused ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onResume}
                disabled={!onResume}
              >
                {PLAY_ICON}
                <span className="ax-btn__content--hidden">Reprendre</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onPause}
                disabled={!onPause}
              >
                {PAUSE_ICON}
                <span className="ax-btn__content--hidden">Pause</span>
              </Button>
            )}
            {onClearCompleted && (
              <Button variant="ghost" size="sm" onClick={onClearCompleted}>
                {TRASH_ICON}
                <span className="ax-btn__content--hidden">Purger termines</span>
              </Button>
            )}
            {onPurgeFailed && (
              <Button variant="ghost" size="sm" onClick={handlePurgeFailed}>
                <Badge variant="danger" size="sm">Purger echecs</Badge>
              </Button>
            )}
          </>
        )}

        {variant === 'history' && onPurgeFailed && (
          <Button variant="ghost" size="sm" onClick={handlePurgeFailed}>
            {TRASH_ICON}
            <span className="ax-btn__content--hidden">Purger echecs</span>
          </Button>
        )}

        {variant === 'storage' && onRefresh && (
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            {REFRESH_ICON}
            <span className="ax-btn__content--hidden">Actualiser</span>
          </Button>
        )}
      </div>
    </div>
  )
}