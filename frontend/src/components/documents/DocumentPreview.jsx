/**
 * ALPHIX V2 — DocumentPreview
 * Overlay modal de previsualisation (portal) embarquant la visionneuse.
 */

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Button from '../ui/Button'
import DocumentViewer from './DocumentViewer'
import DownloadButton from './DownloadButton'

/**
 * @param {object} props
 * @param {object|null} props.doc - Document API a previsualiser.
 * @param {() => void} props.onClose - Fermeture de l'apercu.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentPreview({ doc, onClose }) {
  const [zoom, setZoom] = useState(1)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    window.document.addEventListener('keydown', handleKeyDown)
    window.document.body.style.overflow = 'hidden'
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown)
      window.document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return createPortal(
    <div className="ax-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="ax-modal ax-modal--preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Apercu : ${doc?.title || 'document'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <DocumentViewer
          document={doc}
          zoom={zoom}
          onZoomChange={(delta) => setZoom((z) => Math.min(3, Math.max(0.5, z + delta)))}
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen((value) => !value)}
        />
        <div className="ax-form-actions">
          {doc?.id ? <DownloadButton documentId={doc.id} size="md" /> : null}
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  )
}
