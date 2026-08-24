/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Document Preview Page
 * ---------------------------------------------------------------------------
 * Page plein ecran embarquant la visionneuse securisee (zoom, plein ecran,
 * telechargement, partage natif si disponible).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentApi } from '../../api/DocumentApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Card } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import DocumentViewer from '../../components/documents/DocumentViewer'
import DownloadButton from '../../components/documents/DownloadButton'
import { useNotification } from '../../hooks/useNotification'

/**
 * Page de previsualisation d'un document.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotification()

  const [document, setDocument] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await DocumentApi.get(id)
        if (!cancelled) setDocument(data)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement du document.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [id])

  /** Partage natif (Web Share API) avec repli silencieux. */
  const handleShare = async () => {
    if (!navigator.share || !document) return
    try {
      await navigator.share({
        title: document.title || 'Document ALPHIX',
        url: window.location.href,
      })
    } catch {
      // Annulation utilisateur : aucun message necessaire.
    }
  }

  return (
    <Container>
      <PageHeader
        title={document?.title || 'Apercu du document'}
        subtitle="Visionneuse securisee"
        actions={
          <Button variant="ghost" size="md" onClick={() => navigate(`${ROUTE_PATHS.DOCUMENTS}/${id}`)}>
            Retour a la fiche
          </Button>
        }
      />

      {isLoading && (
        <div style={{ padding: 'var(--ax-space-12) 0' }} role="status">
          <div className="ax-doc-skeleton ax-card ax-card--padded" aria-label="Chargement de l'apercu">
            <span className="ax-doc-skeleton__line ax-doc-skeleton__line--wide" />
            <span className="ax-doc-skeleton__line" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="ax-alert ax-alert--error" role="alert">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(`${ROUTE_PATHS.DOCUMENTS}/${id}`)}>
            Voir la fiche
          </Button>
        </div>
      )}

      {!isLoading && !error && document && (
        <>
          <Card className="ax-card--padded">
            <DocumentViewer
              document={document}
              zoom={zoom}
              onZoomChange={(delta) => setZoom((z) => Math.min(3, Math.max(0.5, Number((z + delta).toFixed(2)))))}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen((value) => !value)}
            />
          </Card>

          <div className="ax-form-actions" style={{ justifyContent: 'flex-start' }}>
            <DownloadButton
              documentId={document.id}
              size="md"
              onDownloaded={() => notify.success('Telechargement enregistre.')}
            />
            {typeof navigator !== 'undefined' && navigator.share ? (
              <Button type="button" variant="secondary" size="md" onClick={handleShare}>
                Partager
              </Button>
            ) : null}
          </div>
        </>
      )}
    </Container>
  )
}