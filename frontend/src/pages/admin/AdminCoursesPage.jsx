/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Cours
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import { CourseApi } from '../../api/CourseApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { FacultyApi } from '../../api/FacultyApi'
import { SemesterApi } from '../../api/SemesterApi'
import { normalizeApiList } from '../../utils/academic'
import { paginate } from '../../utils/admin'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminTable from '../../components/admin/AdminTable'
import Button from '../../components/ui/Button'
import { useNotification } from '../../hooks/useNotification'

export default function AdminCoursesPage() {
  const [items, setItems] = useState([])
  const [departments, setDepartments] = useState([])
  const [faculties, setFaculties] = useState([])
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', department_id: '', semester_id: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const notify = useNotification()

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const [deps, facs, sems] = await Promise.all([
        DepartmentApi.list().catch(() => []),
        FacultyApi.list().catch(() => []),
        SemesterApi.list().catch(() => []),
      ])
      if (signal?.aborted) return
      setDepartments(normalizeApiList(deps))
      setFaculties(normalizeApiList(facs))
      setSemesters(normalizeApiList(sems))
      // Courses index is excluded backend - try filtered fetch as fallback
      try {
        const courseRes = await CourseApi.list?.()
        if (!signal?.aborted && courseRes) setItems(normalizeApiList(courseRes))
      } catch { /* index not available */ }
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

  const paginated = paginate(items, page, 10)

  const openCreate = useCallback(() => { setEditing({ id: null }); setForm({ name: '', code: '', department_id: '', semester_id: '' }) }, [])
  const openEdit = useCallback((row) => { setEditing(row); setForm({ name: row.name || '', code: row.code || '', department_id: String(row.department_id || ''), semester_id: String(row.semester_id || '') }) }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const payload = { name: form.name, code: form.code, department_id: form.department_id ? Number(form.department_id) : null, semester_id: form.semester_id ? Number(form.semester_id) : null }
    try {
      if (editing?.id) {
        const updated = await CourseApi.update(editing.id, payload)
        setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...(updated?.data || updated || payload) } : x)))
        notify.success('Cours mis à jour.')
      } else {
        const created = await CourseApi.create(payload)
        setItems((prev) => [...prev, created?.data || created])
        notify.success('Cours créé.')
      }
      setEditing(null)
    } catch { notify.error('Échec de l’enregistrement.') }
  }, [editing, form, notify])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await CourseApi.delete(deleteTarget.id)
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      notify.success('Cours supprimé.')
    } catch { notify.error('Échec de la suppression.') }
    finally { setDeleteTarget(null) }
  }, [deleteTarget, notify])

  if (loading) return <LoadingScreen label="Chargement des cours…" />
  if (error) return <div className="ax-container"><PageHeader title="Cours" subtitle="Administration" /><div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div></div>

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Nom' },
    { key: 'department', label: 'Département', render: (_, row) => departments.find((d) => String(d.id) === String(row.department_id))?.name || '—' },
    { key: 'faculty', label: 'Faculté', render: (_, row) => {
      const dep = departments.find((d) => String(d.id) === String(row.department_id))
      return faculties.find((f) => String(f.id) === String(dep?.faculty_id))?.name || '—'
    }},
    { key: 'semester', label: 'Semestre', render: (_, row) => semesters.find((s) => String(s.id) === String(row.semester_id))?.name || '—' },
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
  const rows = paginated.items.map((x) => ({ key: x.id, _id: x.id, code: x.code, name: x.name, department_id: x.department_id, semester_id: x.semester_id, actions: null }))

  return (
    <div className="ax-container">
      <PageHeader title="Cours" subtitle={`${items.length} cours`} actions={<Button variant="primary" size="sm" onClick={openCreate}>Nouveau cours</Button>} />
      {items.length === 0 && <div className="ax-card ax-card--padded"><p className="ax-text--muted">Aucun cours listé. L’endpoint index est exclu côté backend (accès par département/semestre/niveau) — utilisez la création pour ajouter un cours, ou consultez les pages publiques.</p></div>}
      <AdminTable columns={columns} rows={rows} caption="Liste des cours" pagination={paginated} onPageChange={setPage} />

      {editing && (
        <div className="ax-modal__overlay" role="presentation" onClick={() => setEditing(null)}>
          <div className="ax-modal" role="dialog" aria-modal="true" aria-label={editing.id ? 'Modifier le cours' : 'Créer un cours'} onClick={(e) => e.stopPropagation()}>
            <h2 className="ax-modal__title">{editing.id ? 'Modifier le cours' : 'Nouveau cours'}</h2>
            <form onSubmit={handleSubmit} className="ax-form">
              <label className="ax-field"><span className="ax-field__label">Nom</span><input className="ax-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label className="ax-field"><span className="ax-field__label">Code</span><input className="ax-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></label>
              <label className="ax-field"><span className="ax-field__label">Département</span>
                <select className="ax-input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {departments.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                </select>
              </label>
              <label className="ax-field"><span className="ax-field__label">Semestre</span>
                <select className="ax-input" value={form.semester_id} onChange={(e) => setForm({ ...form, semester_id: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {semesters.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </label>
              <div className="ax-modal__actions"><Button variant="ghost" size="sm" type="button" onClick={() => setEditing(null)}>Annuler</Button><Button variant="primary" size="sm" type="submit">Enregistrer</Button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={Boolean(deleteTarget)} title="Supprimer le cours" message={deleteTarget ? `Supprimer « ${deleteTarget.name} » ?` : ''} confirmLabel="Supprimer" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}