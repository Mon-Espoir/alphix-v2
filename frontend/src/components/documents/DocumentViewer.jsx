/**
 * ALPHIX V2 — DocumentViewer
 * Visionneuse integree securisee : rendu iframe si une URL de fichier est
 * exposee par l'API, sinon etat vide explicite (aucune donnée fabriquee).
 * Zoom + plein écran natifs, accessibles au clavier.
 */

import { useRef } from 'react'
import Button from '../ui/Button'
import { resolveFileUrl } from '../../utils/document'

/**
 * @param {object} props
 * @param {object|null} props.document - Document API.
 * @param {number} props.zoom - Niveau de zoom (1 = 100%).
 * @param {(delta: number) => void} props.onZoomChange - Variation relative de zoom.
 * @param {boolean} props.isFullScreen - Mode plein ecran actif.
 * @param {() => void} props.onToggleFullScreen - Bascule plein ecran.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentViewer({
  document: doc,
  zoom,
  onZoomChange,
  isFullScreen,
  onToggleFullScreen,
}) {
  const containerRef = useRef(null)
  const fileUrl = resolveFileUrl(doc)

  const enterFullScreen = () => {
    const node = containerRef.current
    if (!node) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      node.requestFullscreen().catch(() => {})
    }
    onToggleFullScreen()
  }

  if (!fileUrl) {
    return (
      <div className="ax-empty-state" ref={containerRef}>
        <p className="ax-empty-state__title">Apercu indisponible</p>
        <p className="ax-empty-state__desc">
          Aucune URL de fichier n'est exposee pour ce document par la plateforme.
          Utilisez le telechargement pour y acceder.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`ax-doc-viewer ${isFullScreen ? 'ax-doc-viewer--fullscreen' : ''}`}
    >
      <div className="ax-doc-viewer__controls" role="toolbar" aria-label="Contrôles de la visionneuse">
        <Button type="button" variant="outline" size="sm" onClick={() => onZoomChange(-0.25)} aria-label="Reduire le zoom">
          −
        </Button>
        <span className="ax-doc-viewer__zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <Button type="button" variant="outline" size="sm" onClick={() => onZoomChange(0.25)} aria-label="Augmenter le zoom">
          +
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={enterFullScreen}>
          {isFullScreen ? 'Quitter le plein ecran' : 'Plein ecran'}
        </Button>
      </div>
      <iframe
        className="ax-doc-viewer__frame"
        src={fileUrl}
        title={`Apercu du document ${doc?.title || ''}`}
        style={{ transform: `scale(${zoom})` }}
      />
    </div>
  )
}