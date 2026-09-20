/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Automation / Confirm metadata dialog (low confidence)
 * ---------------------------------------------------------------------------
 * Accessible modal — keyboard trapped, focus management, ARIA.
 */

/* eslint-disable react-hooks/set-state-in-effect -- sync formulaire à l'ouverture, intentionnel */
import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { AUTOMATION_DOC_TYPES } from '../../constants/automation'

export default function ConfirmMetadataDialog({ open, meta, suggestions, confidence, onConfirm, onCancel, faculties = [], departments = [], courses = [], semesters = [] }) {
  const dialogRef = useRef(null)
  const prevFocusRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const [edit, setEdit] = useState({ facultyId: '', departmentId: '', courseId: '', semesterId: '', docType: '' })

  useEffect(() => {
    if (!open) return undefined
    prevFocusRef.current = document.activeElement
    const el = dialogRef.current
    const id = setTimeout(() => el?.querySelector('button')?.focus(), 0)
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
      if (e.key === 'Tab' && el) {
        const focusable = el.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(id)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prevFocusRef.current?.focus()
    }
  }, [open, onCancel])

  // Sync formulaire d'édition à l'ouverture
  useEffect(() => {
    if (open && suggestions) {
      setEdit({
        facultyId: String(suggestions.faculty?.id || ''),
        departmentId: String(suggestions.department?.id || ''),
        courseId: String(suggestions.course?.id || ''),
        semesterId: String(suggestions.semester?.id || ''),
        docType: String(suggestions.docType || 'other'),
      })
      setIsEditing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const filteredDepartments = edit.facultyId ? departments.filter((d) => String(d.faculty_id) === String(edit.facultyId)) : departments
  const filteredCourses = edit.departmentId ? courses.filter((c) => String(c.department_id) === String(edit.departmentId)) : courses

  const handleSave = () => {
    const faculty = faculties.find((f) => String(f.id) === String(edit.facultyId)) || suggestions?.faculty || null
    const department = departments.find((d) => String(d.id) === String(edit.departmentId)) || suggestions?.department || null
    const course = courses.find((c) => String(c.id) === String(edit.courseId)) || suggestions?.course || null
    const semester = semesters.find((s) => String(s.id) === String(edit.semesterId)) || suggestions?.semester || null
    onConfirm({
      ...suggestions,
      faculty, department, course, semester, docType: edit.docType,
    })
    setIsEditing(false)
  }

  return (
    <div className="ax-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="ax-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-confirm-title"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
      >
        <h2 id="automation-confirm-title" className="ax-modal__title">{isEditing ? 'Corriger les métadonnées' : 'Confirmer les métadonnées'}</h2>
        <p className="ax-modal__message">
          Confiance {Math.round(confidence * 100)}% — {isEditing ? 'corrigez les champs puis enregistrez.' : 'veuillez valider les suggestions extraites du nom de fichier.'}
        </p>

        {!isEditing ? (
          <dl className="ax-definition-list">
            <dt>Fichier</dt><dd className="ax-text--mono">{meta?.raw || '—'}</dd>
            <dt>Type suggéré</dt><dd><Badge variant="primary" size="sm">{suggestions?.docType || '—'}</Badge></dd>
            <dt>Cours</dt><dd>{suggestions?.course?.name || suggestions?.course?.code || '—'} <Badge variant="default" size="sm">{Math.round((suggestions?.scores?.course || 0)*100)}%</Badge></dd>
            <dt>Faculté</dt><dd>{suggestions?.faculty?.name || '—'}</dd>
            <dt>Département</dt><dd>{suggestions?.department?.name || '—'}</dd>
            <dt>Semestre</dt><dd>{suggestions?.semester?.name || suggestions?.semester?.code || '—'}</dd>
          </dl>
        ) : (
          <div className="ax-form" style={{ display: 'grid', gap: '12px' }}>
            <label className="ax-field"><span className="ax-field__label">Faculté</span>
              <select className="ax-input" value={edit.facultyId} onChange={(e) => setEdit({ ...edit, facultyId: e.target.value, departmentId: '', courseId: '' })}>
                <option value="">— Aucune —</option>
                {faculties.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
              </select>
            </label>
            <label className="ax-field"><span className="ax-field__label">Département</span>
              <select className="ax-input" value={edit.departmentId} onChange={(e) => setEdit({ ...edit, departmentId: e.target.value, courseId: '' })}>
                <option value="">— Aucun —</option>
                {filteredDepartments.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </label>
            <label className="ax-field"><span className="ax-field__label">Cours</span>
              <select className="ax-input" value={edit.courseId} onChange={(e) => setEdit({ ...edit, courseId: e.target.value })}>
                <option value="">— Aucun —</option>
                {filteredCourses.map((c) => <option key={c.id} value={String(c.id)}>{c.code ? `${c.code} — ` : ''}{c.name || c.title}</option>)}
              </select>
            </label>
            <label className="ax-field"><span className="ax-field__label">Semestre</span>
              <select className="ax-input" value={edit.semesterId} onChange={(e) => setEdit({ ...edit, semesterId: e.target.value })}>
                <option value="">— Aucun —</option>
                {semesters.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
            </label>
            <label className="ax-field"><span className="ax-field__label">Type</span>
              <select className="ax-input" value={edit.docType} onChange={(e) => setEdit({ ...edit, docType: e.target.value })}>
                {AUTOMATION_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
        )}

        <div className="ax-modal__actions">
          {!isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Corriger</Button>
              <Button variant="primary" size="sm" onClick={() => onConfirm(suggestions)}>Confirmer</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Annuler</Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>Fermer</Button>
              <Button variant="primary" size="sm" onClick={handleSave}>Enregistrer les corrections</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
