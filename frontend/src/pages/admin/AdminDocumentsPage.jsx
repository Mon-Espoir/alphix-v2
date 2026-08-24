/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Documents (modération)
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DocumentApi } from '../../api/DocumentApi'
import { normalizeApiList } from '../../utils/academic'
import { filterDocuments, paginate } from '../../utils/admin'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminSearchBar from '../../components/admin/AdminSearchBar'
import AdminTable from '../../components/admin/AdminTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useNotification } from '../../hooks/useNotification'

const STATUS_VARIANT = { pending: 'warning', approved: 'success', rejected: 'danger', archived: 'default' }

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [visibility, setVisibility] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)
  const [detail, setDetail] = useState(null)
  const notify = useNotification()

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await DocumentApi.list({ per_page: 100 })
      if (signal?.aborted) return
      setDocs(normalizeApiList(res))
    } catch (err) {
      if (!signal?.aborted) setError(err.message || 'Erreur de chargement.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])



  const filtered = useMemo(() => filterDocuments(docs, { query, status, visibility }), [docs, query, status, visibility])
  const paginated = useMemo(() => paginate(filtered, page, 15), [filtered, page])

  const execAction = useCallback(async () => {
    if (!confirm) return
    const { doc, action } = confirm
    const payloadMap = {
      approve: { status: 'approved' },
      reject: { status: 'rejected' },
      archive: { status: 'archived' },
      visibility_public: { visibility: 'public' },
      visibility_private: { visibility: 'private' },
    }
    const payload = payloadMap[action]
    try {
      await DocumentApi.patch(doc.id, payload)
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, ...payload } : d)))
      notify.success('Document mis à jour.')
    } catch {
      notify.error('Échec de la mise à jour.')
    } finally {
      setConfirm(null)
    }
  }, [confirm, notify])

  if (loading) return <LoadingScreen label="Chargement des documents…" />
  if (error) {
    return (
      <div className="ax-container">
        <PageHeader title="Modération des documents" subtitle="File d’attente" />
        <div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div>
      </div>
    )
  }

  const columns = [
    { key: 'title', label: 'Titre', render: (v) => <span className="ax-text--truncate" title={v}>{v || '—'}</span> },
    { key: 'status', label: 'Statut', render: (v) => <Badge variant={STATUS_VARIANT[v] || 'default'} size="sm">{v || '—'}</Badge> },
    { key: 'visibility', label: 'Visibilité', render: (v) => <Badge variant="default" size="sm">{v || '—'}</Badge> },
    { key: 'version', label: 'Version', render: (v) => v || '—' },
    { key: 'created_at', label: 'Créé le', render: (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—') },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <span className="ax-admin-row-actions">
          <Button variant="ghost" size="sm" onClick={() => setDetail(docs.find((d) => d.id === row._id))}>Détails</Button>
          <Button variant="primary" size="sm" onClick={() => setConfirm({ doc: docs.find((d) => d.id === row._id), action: 'approve' })}>Approuver</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm({ doc: docs.find((d) => d.id === row._id), action: 'reject' })}>Rejeter</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm({ doc: docs.find((d) => d.id === row._id), action: 'archive' })}>Archiver</Button>
        </span>
      ),
    },
  ]

  const rows = paginated.items.map((d) => ({ key: d.id, _id: d.id, title: d.title, status: d.status, visibility: d.visibility, version: d.version, created_at: d.created_at, actions: null }))

  return (
    <div className="ax-container">
      <PageHeader title="Modération des documents" subtitle={`${filtered.length} document(s) — file d’attente`} />

      <div className="ax-admin-filters">
        <AdminSearchBar value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Titre ou description…" />
        <label className="ax-field">
          <span className="ax-field__label">Statut</span>
          <select className="ax-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">Tous</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
            <option value="archived">Archivés</option>
          </select>
        </label>
        <label className="ax-field">
          <span className="ax-field__label">Visibilité</span>
          <select className="ax-input" value={visibility} onChange={(e) => { setVisibility(e.target.value); setPage(1) }}>
            <option value="">Toutes</option>
            <option value="public">Public</option>
            <option value="private">Privé</option>
            <option value="restricted">Restreint</option>
          </select>
        </label>
      </div>

      <AdminTable columns={columns} rows={rows} caption="Documents à modérer" pagination={paginated} onPageChange={setPage} />

      {detail && (
        <div className="ax-modal__overlay" role="presentation" onClick={() => setDetail(null)}>
          <div className="ax-modal" role="dialog" aria-modal="true" aria-label={`Détails: ${detail.title}`} onClick={(e) => e.stopPropagation()}>
            <h2 className="ax-modal__title">{detail.title}</h2>
            <dl className="ax-definition-list">
              <dt>Slug</dt><dd className="ax-text--mono">{detail.slug}</dd>
              <dt>Description</dt><dd>{detail.description || '—'}</dd>
              <dt>Type</dt><dd>{detail.doc_type || '—'}</dd>
              <dt>Statut / Visibilité</dt><dd>{detail.status} / {detail.visibility}</dd>
              <dt>Version</dt><dd>{detail.version || '—'}</dd>
              <dt>Cours ID</dt><dd>{detail.course_id || '—'}</dd>
              <dt>Historique versions</dt><dd>{detail.metadata?.versions ? JSON.stringify(detail.metadata.versions) : '—'}</dd>
            </dl>
            <div className="ax-modal__actions">
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Fermer</Button>
              <Button variant="outline" size="sm" onClick={() => { setDetail(null); setConfirm({ doc: detail, action: 'visibility_public' }) }}>Rendre public</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm ? `Confirmer: ${confirm.action}` : ''}
        message={confirm ? `Appliquer l’action « ${confirm.action} » au document « ${confirm.doc.title} » ?` : ''}
        confirmLabel="Confirmer"
        variant={confirm?.action === 'reject' ? 'danger' : 'primary'}
        onConfirm={execAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}