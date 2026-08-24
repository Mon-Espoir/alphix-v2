/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Facultés
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import { FacultyApi } from '../../api/FacultyApi'
import { normalizeApiList } from '../../utils/academic'
import { computeEntityStats, paginate } from '../../utils/admin'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminTable from '../../components/admin/AdminTable'
import AdminSection from '../../components/admin/AdminSection'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useNotification } from '../../hooks/useNotification'

export default function AdminFacultiesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const notify = useNotification()

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await FacultyApi.list()
      if (signal?.aborted) return
      setItems(normalizeApiList(res))
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

  const stats = computeEntityStats(items)
  const paginated = paginate(items, page, 10)

  const openCreate = useCallback(() => { setEditing({ id: null }); setForm({ name: '', code: '' }) }, [])
  const openEdit = useCallback((row) => { setEditing(row); setForm({ name: row.name || '', code: row.code || '' }) }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    try {
      if (editing?.id) {
        const updated = await FacultyApi.update(editing.id, form)
        setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...(updated?.data || updated || form) } : x)))
        notify.success('Faculté mise à jour.')
      } else {
        const created = await FacultyApi.create(form)
        const record = created?.data || created
        setItems((prev) => [...prev, record])
        notify.success('Faculté créée.')
      }
      setEditing(null)
    } catch {
      notify.error('Échec de l’enregistrement.')
    }
  }, [editing, form, notify])

  const handleToggle = useCallback(async (row) => {
    const next = !(row.status === true || row.status === 1)
    try {
      await FacultyApi.patch(row.id, { status: next })
      setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, status: next } : x)))
      notify.success(next ? 'Faculté activée.' : 'Faculté désactivée.')
    } catch { notify.error('Échec du changement de statut.') }
  }, [notify])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await FacultyApi.delete(deleteTarget.id)
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      notify.success('Faculté supprimée.')
    } catch { notify.error('Échec de la suppression.') }
    finally { setDeleteTarget(null) }
  }, [deleteTarget, notify])

  if (loading) return <LoadingScreen label="Chargement des facultés…" />
  if (error) return <div className="ax-container"><PageHeader title="Facultés" subtitle="Administration" /><div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div></div>

  const columns = [
    { key: 'name', label: 'Nom' },
    { key: 'code', label: 'Code' },
    { key: 'status', label: 'Statut', render: (v) => <Badge variant={v === true || v === 1 ? 'success' : 'danger'} size="sm">{v === true || v === 1 ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <span className="ax-admin-row-actions">
          <Button variant="ghost" size="sm" onClick={() => openEdit(items.find((x) => x.id === row._id))}>Modifier</Button>
          <Button variant="ghost" size="sm" onClick={() => handleToggle(items.find((x) => x.id === row._id))}>{row.status ? 'Désactiver' : 'Activer'}</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(items.find((x) => x.id === row._id))}>Supprimer</Button>
        </span>
      ),
    },
  ]
  const rows = paginated.items.map((x) => ({ key: x.id, _id: x.id, name: x.name, code: x.code, status: x.status ?? true, actions: null }))

  return (
    <div className="ax-container">
      <PageHeader title="Facultés" subtitle={`${stats.total} faculté(s) — ${stats.active} active(s)`} actions={<Button variant="primary" size="sm" onClick={openCreate}>Nouvelle faculté</Button>} />

      <AdminSection title="Statistiques">
        <p className="ax-text--muted">Total : {stats.total} — Actives : {stats.active} — Inactives : {stats.total - stats.active}</p>
      </AdminSection>

      <AdminTable columns={columns} rows={rows} caption="Liste des facultés" pagination={paginated} onPageChange={setPage} />

      {editing && (
        <div className="ax-modal__overlay" role="presentation" onClick={() => setEditing(null)}>
          <div className="ax-modal" role="dialog" aria-modal="true" aria-label={editing.id ? 'Modifier la faculté' : 'Créer une faculté'} onClick={(e) => e.stopPropagation()}>
            <h2 className="ax-modal__title">{editing.id ? 'Modifier la faculté' : 'Nouvelle faculté'}</h2>
            <form onSubmit={handleSubmit} className="ax-form">
              <label className="ax-field"><span className="ax-field__label">Nom</span><input className="ax-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label className="ax-field"><span className="ax-field__label">Code</span><input className="ax-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></label>
              <div className="ax-modal__actions"><Button variant="ghost" size="sm" type="button" onClick={() => setEditing(null)}>Annuler</Button><Button variant="primary" size="sm" type="submit">Enregistrer</Button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={Boolean(deleteTarget)} title="Supprimer la faculté" message={deleteTarget ? `Supprimer « ${deleteTarget.name} » ? Cette action est irréversible.` : ''} confirmLabel="Supprimer" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}