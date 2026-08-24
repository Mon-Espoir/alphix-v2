/**
 * ALPHIX V2 — UploadQueue
 * Liste reutilisable des elements de la file d'attente.
 * Version desktop (tableau) + mobile (cartes) via CSS.
 * Actions contextuelles selon le statut.
 */

import { useCallback, useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import UploadProgress from './UploadProgress'
import DuplicateDialog from './DuplicateDialog'
import { UPLOAD_ITEM_STATUS, UPLOAD_STATUS_LABELS, UPLOAD_STATUS_BADGES } from '../../constants/upload'
import { formatBytes } from '../../utils/upload'
import { useNotification } from '../../hooks/useNotification'

const ACTION_ICONS = {
  cancel: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  ),
  retry: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 12a8 8 0 0 1 11.3-7.1M20 12v4h-4" />
    </svg>
  ),
  delete: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  ),
  hash: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 2a6 6 0 0 1 6 6M10 2a6 6 0 0 0-6 6" />
    </svg>
  ),
}

/**
 * @param {object} props
 * @param {object[]} props.items - Elements (vues) de la file.
 * @param {string|null} props.activeId - ID de l'element actif.
 * @param {boolean} props.isPaused - File en pause.
 * @param {function(string): void} props.onCancel - Annulation.
 * @param {function(string): void} props.onRetry - Nouvelle tentative.
 * @param {function(string): void} props.onRemove - Suppression definitive.
 * @param {function(string, string): Promise<void>} props.onResolveDuplicate - Resolution doublon.
 * @param {boolean} [props.showGlobalActions=true] - Affiche pause/reprise.
 * @param {function(): void} [props.onPause] - Pause globale.
 * @param {function(): void} [props.onResume] - Reprise globale.
 * @param {function(): void} [props.onClearCompleted] - Purge terminees.
 */
export default function UploadQueue({
  items,
  activeId,
  isPaused,
  onCancel,
  onRetry,
  onRemove,
  onResolveDuplicate,
  showGlobalActions = true,
  onPause,
  onResume,
  onClearCompleted,
}) {
  const notify = useNotification()
  const [duplicateOpen, setDuplicateOpen] = useState(null)

  const openDuplicate = useCallback((item) => setDuplicateOpen(item), [])

  const handleResolve = useCallback(
    async (decision) => {
      if (!duplicateOpen) return
      try {
        await onResolveDuplicate(duplicateOpen.id, decision)
        notify.success(
          decision === 'replace'
            ? 'Document remplace.'
            : decision === 'keep_both'
            ? 'Nouvelle revision enregistree.'
            : 'Doublon annule.',
        )
      } catch {
        notify.error('Echec de la resolution.')
      } finally {
        setDuplicateOpen(null)
      }
    },
    [duplicateOpen, onResolveDuplicate, notify],
  )

  const isActive = useCallback(
    (id) => id === activeId,
    [activeId],
  )

  const isTerminal = useCallback(
    (status) =>
      status === UPLOAD_ITEM_STATUS.UPLOADED ||
      status === UPLOAD_ITEM_STATUS.FAILED ||
      status === UPLOAD_ITEM_STATUS.CANCELLED,
    [],
  )

  const isDuplicating = useCallback(
    (status) => status === UPLOAD_ITEM_STATUS.AWAITING_DECISION,
    [],
  )

  const getStatusBadgeVariant = (status) => UPLOAD_STATUS_BADGES[status] || 'default'
  const getStatusLabel = (status) => UPLOAD_STATUS_LABELS[status] || status

  if (!items || items.length === 0) {
    return (
      <div className="ax-empty-state" role="status">
        <p className="ax-empty-state__title">File d'attente vide</p>
        <p className="ax-empty-state__desc">
          {isPaused ? 'La file est en pause.' : 'Deposez des fichiers pour demarrer.'}
        </p>
      </div>
    )
  }

  return (
    <div className="ax-upload-queue">
      {showGlobalActions && (
        <div className="ax-upload-queue__toolbar">
          {isPaused ? (
            <Button variant="primary" size="sm" onClick={onResume} disabled={!onResume}>
              Reprendre la file
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={onPause} disabled={!onPause}>
              Mettre en pause
            </Button>
          )}
          {onClearCompleted && (
            <Button variant="ghost" size="sm" onClick={onClearCompleted}>
              Purger les envoyes
            </Button>
          )}
        </div>
      )}

      <div className="ax-upload-queue__list" role="list" aria-label="File d'attente d'envoi">
        {items.map((item) => {
          const active = isActive(item.id)
          const terminal = isTerminal(item.status)
          const awaiting = isDuplicating(item.status)
          const statusVariant = getStatusBadgeVariant(item.status)

          return (
            <article
              key={item.id}
              className={[
                'ax-upload-queue__item',
                active ? 'ax-upload-queue__item--active' : '',
                terminal ? 'ax-upload-queue__item--terminal' : '',
                awaiting ? 'ax-upload-queue__item--duplicate' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-busy={!terminal ? 'true' : 'false'}
            >
              <div className="ax-upload-queue__main">
                <div className="ax-upload-queue__file-info">
                  <div className="ax-upload-queue__name" title={item.name}>
                    {item.name}
                  </div>
                  <div className="ax-upload-queue__meta">
                    <span>{formatBytes(item.size)}</span>
                    {item.mimeType && <span>{item.mimeType.split('/')[1]?.toUpperCase()}</span>}
                    {item.hash && (
                      <span className="ax-upload-queue__hash" title={item.hash}>
                        SHA-256: {item.hash.slice(0, 16)}...
                      </span>
                    )}
                  </div>
                </div>

                <div className="ax-upload-queue__status-group">
                  <Badge variant={statusVariant} size="sm">
                    {getStatusLabel(item.status)}
                  </Badge>
                  {item.attempts > 0 && (
                    <Badge variant="warning" size="sm">
                      Tentative {item.attempts}
                    </Badge>
                  )}
                </div>
              </div>

              {active && (
                <UploadProgress
                  value={item.progress}
                  phaseLabel={item.phaseLabel}
                  speed={item.speed}
                  etaMs={item.etaMs}
                  bytesLoaded={item.bytesLoaded}
                  totalBytes={item.size}
                />
              )}

              <div className="ax-upload-queue__actions">
                {awaiting && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDuplicate(item)}
                    aria-label="Resoudre le doublon"
                  >
                    <span className="ax-btn__icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 10l4 4 6-6" />
                      </svg>
                    </span>
                    Resoudre
                  </Button>
                )}

                {active && !awaiting && !terminal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(item.id)}
                    aria-label="Annuler l'envoi"
                  >
                    {ACTION_ICONS.cancel}
                    <span className="ax-btn__content--hidden">Annuler</span>
                  </Button>
                )}

                {terminal && item.status === UPLOAD_ITEM_STATUS.FAILED && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onRetry(item.id)}
                    aria-label="Reessayer"
                  >
                    {ACTION_ICONS.retry}
                    <span className="ax-btn__content--hidden">Reessayer</span>
                  </Button>
                )}

                {terminal && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    aria-label="Supprimer de l'historique"
                  >
                    {ACTION_ICONS.delete}
                  </IconButton>
                )}
              </div>

              {item.error && (
                <div className="ax-upload-queue__error" role="alert">
                  <span className="ax-upload-queue__error-icon" aria-hidden="true">!</span>
                  {item.error.message}
                </div>
              )}

              {item.duplicateOf && !awaiting && item.resolution && (
                <div className="ax-upload-queue__resolution">
                  Resolution: {item.resolution === 'replace' ? 'Remplace' : 'Revision'}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {duplicateOpen && (
        <DuplicateDialog
          open={true}
          incomingFile={{
            name: duplicateOpen.name,
            size: duplicateOpen.size,
            hash: duplicateOpen.hash,
          }}
          existingDocument={duplicateOpen.duplicateOf}
          onConfirm={handleResolve}
          onCancel={() => setDuplicateOpen(null)}
        />
      )}
    </div>
  )
}