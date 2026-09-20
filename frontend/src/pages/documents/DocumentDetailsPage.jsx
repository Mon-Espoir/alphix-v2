/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Document Details Page
 * ---------------------------------------------------------------------------
 * Fiche complete : titre, mapping academique, tags, description, statistiques,
 * metadonnees, actions (Apercu / Telecharger / Modifier / Supprimer),
 * fil d'Ariane dynamique. Increment de vue au premier affichage.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentApi } from '../../api/DocumentApi'
import { DocumentTagApi } from '../../api/DocumentTagApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Card } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import { Link } from 'react-router-dom'
import DocumentBreadcrumb from '../../components/documents/DocumentBreadcrumb'
import { buildAcademicTrail } from '../../utils/document'
import { semesterLabel } from '../../utils/academic'
import { hasAdminAccess } from '../../utils/admin'
import DocumentMeta from '../../components/documents/DocumentMeta'
import DocumentStatistics from '../../components/documents/DocumentStatistics'
import DocumentTags from '../../components/documents/DocumentTags'
import DownloadButton from '../../components/documents/DownloadButton'
import PreviewButton from '../../components/documents/PreviewButton'
import { useNotification } from '../../hooks/useNotification'
import { useAuth } from '../../hooks/useAuth'

/**
 * Page de details d'un document.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotification()
  const { user } = useAuth()
  // Modification / suppression : tout rôle admin (admin, administrator, super_admin).
  const isAdmin = hasAdminAccess(user)

  const [document, setDocument] = useState(null)
  const [tags, setTags] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setIsLoading(true)
      setError(null)
      try {
        const raw = await DocumentApi.get(id)
        const data = raw?.data ?? raw
        if (cancelled) return
        setDocument(data)
        // Tags charges via l'endpoint dedie (relation non incluse dans show).
        try {
          const tagList = await DocumentTagApi.getByDocument(id)
          if (!cancelled) setTags(Array.isArray(tagList) ? tagList : [])
        } catch {
          if (!cancelled) setTags([])
        }
        // Compteur de vues (endpoint public, echec silencieux).
        try {
          await DocumentApi.incrementView(id)
          if (!cancelled) {
            setDocument((prev) => (prev
              ? { ...prev, views_count: (prev.views_count ?? 0) + 1 }
              : prev))
          }
        } catch {
          // L'increment ne doit jamais bloquer la consultation.
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Erreur lors du chargement du document.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [id])

  /** Trail memoise du fil d'Ariane academique. */
  const trail = useMemo(() => buildAcademicTrail(document), [document])

  const handleDownloaded = () => {
    setDocument((prev) => (prev
      ? { ...prev, downloads_count: (prev.downloads_count ?? 0) + 1 }
      : prev))
    notify.success('Telechargement enregistre.')
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await DocumentApi.delete(id)
      notify.success('Document supprime.')
      navigate(ROUTE_PATHS.DOCUMENTS)
    } catch (err) {
      notify.error(err?.message || 'Erreur lors de la suppression.')
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  return (
    <Container>
      <DocumentBreadcrumb items={trail} />

      {isLoading && (
        <div style={{ padding: 'var(--ax-space-12) 0' }} aria-busy="true">
          <div className="ax-doc-skeleton ax-card ax-card--padded" role="status" aria-label="Chargement du document">
            <span className="ax-doc-skeleton__line ax-doc-skeleton__line--wide" />
            <span className="ax-doc-skeleton__line" />
            <span className="ax-doc-skeleton__line" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="ax-alert ax-alert--error" role="alert">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTE_PATHS.DOCUMENTS)}>
            Retour a la bibliotheque
          </Button>
        </div>
      )}

      {!isLoading && !error && document && (
        <>
          <PageHeader
            title={document.title || 'Document'}
            subtitle={document.description ? undefined : 'Fiche document'}
          />

          {document.description && (
            <Card className="ax-card--padded">
              <p style={{ margin: 0, color: 'var(--ax-text-secondary)' }}>{document.description}</p>
            </Card>
          )}

          {/* Statistiques temps reel */}
          <section aria-label="Statistiques du document">
            <DocumentStatistics
              viewsCount={document.views_count}
              downloadsCount={document.downloads_count}
              isFeatured={Boolean(document.is_featured)}
            />
          </section>

          {/* Actions principales — Modifier/Supprimer reserves a l'administrateur */}
          <div className="ax-form-actions" style={{ justifyContent: 'flex-start' }}>
            <PreviewButton documentId={document.id} size="md" label="Apercu securise" />
            <DownloadButton documentId={document.id} document={document} size="md" onDownloaded={handleDownloaded} />
            {isAdmin && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => navigate(`${ROUTE_PATHS.DOCUMENTS}/${document.id}/edit`)}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  Supprimer
                </Button>
              </>
            )}
          </div>

          {/* Mapping academique (relations chargees par show) */}
          <Card className="ax-card--padded">
            <h3 style={{ marginTop: 0 }}>Contexte académique</h3>
            {document.course ? (
              <dl className="ax-definition-list">
                <dt>Faculté</dt>
                <dd>{document.course?.department?.faculty?.name || '—'}</dd>
                <dt>Département</dt>
                <dd>{document.course?.department?.name || '—'}</dd>
                <dt>Niveau</dt>
                <dd>{document.course?.level?.name || '—'}</dd>
                <dt>Semestre</dt>
                <dd>{semesterLabel(document.course) || document.course?.semester?.name || '—'}</dd>
                <dt>Cours</dt>
                <dd>
                  {(document.course?.code ? `${document.course.code} — ` : '') + (document.course?.title || document.course?.name || '—')}{' '}
                  <Link
                    to={`${ROUTE_PATHS.DOCUMENTS}?course_id=${document.course.id}`}
                    className="ax-link"
                  >
                    Voir les documents du cours
                  </Link>
                </dd>
              </dl>
            ) : (
              <p className="ax-text--muted" style={{ margin: 0 }}>
                Document non rattaché à un cours (course_id absent) — mapping académique indisponible.
              </p>
            )}
          </Card>

          {/* Mapping academique + tags */}
          {tags.length > 0 && (
            <Card className="ax-card--padded">
              <h3 style={{ marginTop: 0 }}>Tags</h3>
              <DocumentTags tags={tags} />
            </Card>
          )}

          {/* Metadonnees techniques */}
          <Card className="ax-card--padded">
            <h3 style={{ marginTop: 0 }}>Metadonnees</h3>
            <DocumentMeta document={document} currentUser={user} />
          </Card>
        </>
      )}

      <ConfirmModal
        open={isDeleteOpen}
        title="Supprimer le document"
        message={`Voulez-vous vraiment supprimer "${document?.title || 'ce document'}" ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </Container>
  )
}