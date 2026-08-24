/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Départements
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import { DepartmentApi } from '../../api/DepartmentApi'
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

export default function AdminDepartmentsPage() {
  const [items, setItems] = useState([])
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', faculty_id: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const notify = useNotification()

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const [d, f] = await Promise.all([DepartmentApi.list().catch(() => []), FacultyApi.list().catch(() => [])])
      if (signal?.aborted) return
      setItems(normalizeApiList(d))
      setFaculties(normalizeApiList(f))
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

  const openCreate = useCallback(() => { setEditing({ id: null }); setForm({ name: '', code: '', faculty_id: '' }) }, [])
  const openEdit = useCallback((row) => { setEditing(row); setForm({ name: row.name || '', code: row.code || '', faculty_id: String(row.faculty_id || '') }) }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const payload = { ...form, faculty_id: form.faculty_id ? Number(form.faculty_id) : null }
    try {
      if (editing?.id) {
        const updated = await DepartmentApi.update(editing.id, payload)
        setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...(updated?.data || updated || payload) } : x)))
        notify.success('Département mis à jour.')
      } else {
        const created = await DepartmentApi.create(payload)
        setItems((prev) => [...prev, created?.data || created])
        notify.success('Département créé.')
      }
      setEditing(null)
    } catch { notify.error('Échec de l’enregistrement.') }
  }, [editing, form, notify])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await DepartmentApi.delete(deleteTarget.id)
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      notify.success('Département supprimé.')
    } catch { notify.error('Échec de la suppression.') }
    finally { setDeleteTarget(null) }
  }, [deleteTarget, notify])

  if (loading) return <LoadingScreen label="Chargement des départements…" />
  if (error) return <div className="ax-container"><PageHeader title="Départements" subtitle="Administration" /><div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div></div>

  const columns = [
    { key: 'name', label: 'Nom' },
    { key: 'code', label: 'Code' },
    { key: 'faculty', label: 'Faculté', render: (_, row) => faculties.find((f) => String(f.id) === String(row.faculty_id))?.name || row.faculty_id || '—' },
    { key: 'status', label: 'Statut', render: (v) => <Badge variant={v === true || v === 1 ? 'success' : 'danger'} size="sm">{v === true || v === 1 ? 'Actif' : 'Inactif'}</Badge> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <span className="ax-admin-row-actions">
          <Button variant="ghost" size="sm" onClick={() => openEdit(items.find((x) => x.id === row._id))}>Modifier</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(items.find((x) => x.id === row._id))}>Supprimer</Button>
        </span>
      ),
    },
  ]
  const rows = paginated.items.map((x) => ({ key: x.id, _id: x.id, name: x.name, code: x.code, faculty_id: x.faculty_id, status: x.status ?? true, actions: null }))

  return (
    <div className="ax-container">
      <PageHeader title="Départements" subtitle={`${stats.total} département(s)`} actions={<Button variant="primary" size="sm" onClick={openCreate}>Nouveau département</Button>} />
      <AdminSection title="Statistiques"><p className="ax-text--muted">Total : {stats.total} — Actifs : {stats.active}</p></AdminSection>
      <AdminTable columns={columns} rows={rows} caption="Liste des départements" pagination={paginated} onPageChange={setPage} />

      {editing && (
        <div className="ax-modal__overlay" role="presentation" onClick={() => setEditing(null)}>
          <div className="ax-modal" role="dialog" aria-modal="true" aria-label={editing.id ? 'Modifier le département' : 'Créer un département'} onClick={(e) => e.stopPropagation()}>
            <h2 className="ax-modal__title">{editing.id ? 'Modifier le département' : 'Nouveau département'}</h2>
            <form onSubmit={handleSubmit} className="ax-form">
              <label className="ax-field"><span className="ax-field__label">Nom</span><input className="ax-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label className="ax-field"><span className="ax-field__label">Code</span><input className="ax-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></label>
              <label className="ax-field"><span className="ax-field__label">Faculté</span>
                <select className="ax-input" value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {faculties.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
                </select>
              </label>
              <div className="ax-modal__actions"><Button variant="ghost" size="sm" type="button" onClick={() => setEditing(null)}>Annuler</Button><Button variant="primary" size="sm" type="submit">Enregistrer</Button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={Boolean(deleteTarget)} title="Supprimer le département" message={deleteTarget ? `Supprimer « ${deleteTarget.name} » ?` : ''} confirmLabel="Supprimer" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}