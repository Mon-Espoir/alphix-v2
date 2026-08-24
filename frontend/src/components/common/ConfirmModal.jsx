/**
 * ALPHIX V2 — ConfirmModal
 * Modal de confirmation avec portail React 19.
 */

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Button from '../ui/Button'

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmLabel='Confirmer']
 * @param {string} [cancelLabel='Annuler']
 * @param {'danger'|'primary'} [props.variant='danger']
 * @param {boolean} [props.loading=false]
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !loading) onCancel()
    },
    [onCancel, loading],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div className="ax-modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="ax-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
      >
        <h2 id="confirm-modal-title" className="ax-modal__title">{title}</h2>
        <p id="confirm-modal-desc" className="ax-modal__message">{message}</p>
        <div className="ax-modal__actions">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} size="md" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
