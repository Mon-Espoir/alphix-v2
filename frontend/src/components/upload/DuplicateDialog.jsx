/**
 * ALPHIX V2 — DuplicateDialog
 * Modal de resolution de doublon avec focus trap, accessibilite WAI-ARIA.
 * Affiche le fichier entrant vs le document existant et les 3 actions.
 */

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { formatBytes } from '../../utils/upload'

const HASH_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M10 2a6 6 0 0 1 6 6M10 2a6 6 0 0 0-6 6" />
  </svg>
)
const DOCUMENT_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M4 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <line x1="8" y1="10" x2="12" y2="10" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
)

/**
 * @param {object} props
 * @param {boolean} props.open - Visibilite du modal.
 * @param {object} props.incomingFile - {name, size, hash}
 * @param {object|null} props.existingDocument - Document existant (API) ou {title, original_name, file_size, version, created_at, origin}
 * @param {function(string): Promise<void>} props.onConfirm - Decision utilisateur.
 * @param {function(): void} props.onCancel - Annulation/fermeture.
 */
export default function DuplicateDialog({
  open,
  incomingFile,
  existingDocument,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  const trapFocus = useCallback((e) => {
    if (!dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Tab') trapFocus(e)
    },
    [onCancel, trapFocus],
  )

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      // Focus initial sur le bouton principal
      setTimeout(() => dialogRef.current?.querySelector('button')?.focus(), 0)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const doc = existingDocument
  const hasDoc = !!doc?.id || !!doc?.title

  return createPortal(
    <div className="ax-modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="ax-modal ax-modal--duplicate"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="duplicate-dialog-title"
        aria-describedby="duplicate-dialog-desc"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
      >
        <h2 id="duplicate-dialog-title" className="ax-modal__title">
          Doublon detecte
        </h2>
        <p id="duplicate-dialog-desc" className="ax-modal__message">
          Un fichier au contenu identique existe deja. Choisissez l'action a effectuer.
        </p>

        <div className="ax-duplicate-dialog__comparison">
          <article className="ax-duplicate-dialog__file">
            <h3 className="ax-duplicate-dialog__section-title">
              <span className="ax-duplicate-dialog__section-icon" aria-hidden="true">{HASH_ICON}</span>
              Fichier entrant
            </h3>
            <dl className="ax-duplicate-dialog__details">
              <dt>Nom</dt>
              <dd title={incomingFile.name}>{incomingFile.name}</dd>
              <dt>Taille</dt>
              <dd>{formatBytes(incomingFile.size)}</dd>
              <dt>Empreinte SHA-256</dt>
              <dd className="ax-duplicate-dialog__hash">{incomingFile.hash}</dd>
            </dl>
          </article>

          {hasDoc && (
            <article className="ax-duplicate-dialog__file">
              <h3 className="ax-duplicate-dialog__section-title">
                <span className="ax-duplicate-dialog__section-icon" aria-hidden="true">{DOCUMENT_ICON}</span>
                Document existant
              </h3>
              <dl className="ax-duplicate-dialog__details">
                <dt>Titre</dt>
                <dd>{doc.title || '-'}</dd>
                <dt>Nom original</dt>
                <dd>{doc.original_name || '-'}</dd>
                <dt>Taille</dt>
                <dd>{formatBytes(doc.file_size)}</dd>
                <dt>Version</dt>
                <dd>{doc.version || '-'}</dd>
                <dt>Cree le</dt>
                <dd>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : '-'}</dd>
                <dt>Source detection</dt>
                <dd>
                  <Badge variant={doc.origin === 'server' ? 'primary' : 'default'} size="sm">
                    {doc.origin === 'server' ? 'Serveur' : 'File locale'}
                  </Badge>
                </dd>
              </dl>
            </article>
          )}
        </div>

        <div className="ax-modal__actions ax-duplicate-dialog__actions">
          <Button
            variant="ghost"
            size="md"
            onClick={() => onConfirm('cancel')}
            disabled={false}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onConfirm('keep_both')}
            disabled={false}
          >
            Conserver les deux (revision)
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => onConfirm('replace')}
            disabled={false}
          >
            Remplacer l'existant
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}