/**
 * ALPHIX V2 — UploadQueue
 * Liste reutilisable des elements de la file d'attente.
 * Version desktop (tableau) + mobile (cartes) via CSS.
 * Affiche icone MIME, nom nettoye, taille lisible et progression reelle.
 */

import { useCallback } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import UploadProgress from './UploadProgress'
import { UPLOAD_ITEM_STATUS, UPLOAD_STATUS_LABELS, UPLOAD_STATUS_BADGES } from '../../constants/upload'
import { formatBytes, cleanFileName, fileCategory } from '../../utils/upload'

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
}

/**
 * @param {object} props
 * @param {object[]} props.items - Elements (vues) de la file.
 * @param {string|null} props.activeId - ID de l'element actif.
 * @param {boolean} props.isPaused - File en pause.
 * @param {function(string): void} props.onCancel - Annulation.
 * @param {function(string): void} props.onRetry - Nouvelle tentative.
 * @param {function(string): void} props.onRemove - Suppression definitive.
 * @param {function(object): void} [props.onClassify] - Reouverture du fallback
 *   de classification (document téléversé mais cours non identifié).
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
  onClassify,
  showGlobalActions = true,
  onPause,
  onResume,
  onClearCompleted,
}) {
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
          const inProgress = !isTerminal(item.status)
          const statusVariant = getStatusBadgeVariant(item.status)
          const category = fileCategory(item.mimeType, item.name)
          const displayName = cleanFileName(item.name)

          return (
            <article
              key={item.id}
              className={[
                'ax-upload-queue__item',
                active ? 'ax-upload-queue__item--active' : '',
                isTerminal(item.status) ? 'ax-upload-queue__item--terminal' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-busy={inProgress ? 'true' : 'false'}
            >
              <div className="ax-upload-queue__main">
                <span className="ax-upload-queue__file-icon" aria-hidden="true">
                  {category.icon}
                </span>
                <div className="ax-upload-queue__file-info">
                  <div className="ax-upload-queue__name" title={displayName}>
                    {displayName}
                  </div>
                  <div className="ax-upload-queue__meta">
                    <span>{category.label}</span>
                    <span>{formatBytes(item.size)}</span>
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
                {active && !isTerminal(item.status) && (
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

                {item.status === UPLOAD_ITEM_STATUS.FAILED && (
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

                {item.status === UPLOAD_ITEM_STATUS.UPLOADED && item.needsClassification && typeof onClassify === 'function' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onClassify(item)}
                    aria-label="Preciser le cours du document"
                  >
                    🎓 Préciser le cours
                  </Button>
                )}

                {isTerminal(item.status) && (
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
            </article>
          )
        })}
      </div>
    </div>
  )
}
