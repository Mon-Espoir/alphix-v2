/* eslint-disable react-hooks/set-state-in-effect */
/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — UploadModal (fallback de classification guidée)
 * ---------------------------------------------------------------------------
 * Affichée quand l'identification automatique/IA du cours a échoué :
 * l'étudiant rattache lui-même son document via une cascade hiérarchique
 * Faculté -> Département -> Niveau -> Semestre -> Cours -> Type.
 * Mobile-first (bottom sheet, cibles >= 44px), jamais d'erreur bloquante.
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { SemesterApi } from '../../api/SemesterApi'
import { CourseApi } from '../../api/CourseApi'
import { UPLOAD_CLASSIFY_TYPES } from '../../constants/upload'
import {
  resolveCourseIds,
  resolveDepartmentFacultyId,
  toSelectOptions,
  semesterOptionsForLevel,
} from '../../utils/academic'
import { cachedAcademicList } from '../../utils/academicCache'

/**
 * @param {object} props
 * @param {boolean} props.open - Modale ouverte.
 * @param {{documentId: number|string, fileName?: string, courseId?: number|string|null, docType?: string|null}} props.target - Document à classifier.
 * @param {() => void} props.onClose - Fermeture (plus tard possible).
 * @param {({courseId: number, docType: string}) => Promise<void>|void} props.onConfirm - Validation (PATCH classify par le parent).
 * @returns {import('react').JSX.Element | null}
 */
export default function UploadModal({ open, target, onClose, onConfirm }) {
  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [levels, setLevels] = useState([])
  const [semesters, setSemesters] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [facultyId, setFacultyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [docType, setDocType] = useState('')

  // Chargement unique des référentiels + pré-remplissage depuis le cours
  // partiellement reconnu (courseId) s'il existe.
  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSaveError(null)
    Promise.all([
      cachedAcademicList('faculties', () => FacultyApi.list()),
      cachedAcademicList('departments', () => DepartmentApi.list()),
      cachedAcademicList('levels', () => LevelApi.list()),
      cachedAcademicList('semesters', () => SemesterApi.list()),
      cachedAcademicList('courses', () => CourseApi.list()),
    ])
      .then(([facs, deps, levs, sems, allCourses]) => {
        if (cancelled) return
        setFaculties(facs)
        setDepartments(deps)
        setLevels(levs)
        setSemesters(sems)
        setCourses(allCourses)
        // Pré-sélection : si l'auto-identification a trouvé un cours, on
        // restaure toute la chaîne hiérarchique pour vérification en 1 tap.
        const initialCourseId = target?.courseId ? String(target.courseId) : ''
        const found = initialCourseId
          ? allCourses.find((c) => String(c.id) === initialCourseId)
          : null
        if (found) {
          const ids = resolveCourseIds(found)
          setFacultyId(ids.facultyId || '')
          setDepartmentId(ids.departmentId || '')
          setLevelId(ids.levelId || '')
          setSemesterId(ids.semesterId || '')
          setCourseId(String(found.id))
        } else {
          setFacultyId('')
          setDepartmentId('')
          setLevelId('')
          setSemesterId('')
          setCourseId('')
        }
        setDocType(
          target?.docType && UPLOAD_CLASSIFY_TYPES.some((t) => t.value === target.docType)
            ? target.docType
            : '',
        )
      })
      .catch(() => {
        if (!cancelled) setLoadError('Listes indisponibles : vérifiez votre connexion puis réessayez.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, target?.courseId, target?.docType, target?.documentId])

  // Verrouille le scroll de fond.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open ])

  const departmentOptions = useMemo(
    () => (facultyId
      ? departments.filter((d) => resolveDepartmentFacultyId(d) === String(facultyId))
      : departments),
    [departments, facultyId],
  )

  // Niveaux/semestres restreints aux cours du département (comme la recherche).
  const deptCourses = useMemo(() => {
    if (!departmentId) return courses
    return courses.filter((c) => resolveCourseIds(c).departmentId === String(departmentId))
  }, [courses, departmentId])

  const levelOptions = useMemo(() => {
    if (!departmentId) return levels
    const narrowed = levels.filter((l) => deptCourses.some((c) => resolveCourseIds(c).levelId === String(l.id)))
    return narrowed.length > 0 ? narrowed : levels
  }, [levels, deptCourses, departmentId])

  const selectedLevelCode = useMemo(
    () => levelOptions.find((l) => String(l.id) === String(levelId))?.code || '',
    [levelOptions, levelId],
  )
  const semesterOpts = useMemo(
    () => semesterOptionsForLevel(semesters, selectedLevelCode),
    [semesters, selectedLevelCode],
  )

  const courseOptions = useMemo(() => {
    let base = departmentId
      ? courses.filter((c) => resolveCourseIds(c).departmentId === String(departmentId))
      : courses
    if (levelId) base = base.filter((c) => resolveCourseIds(c).levelId === String(levelId))
    if (semesterId) base = base.filter((c) => resolveCourseIds(c).semesterId === String(semesterId))
    return toSelectOptions(base, { labelKey: 'name' }).map((option) => {
      const course = base.find((c) => String(c.id) === String(option.value))
      return { value: option.value, label: `${course?.code ? `${course.code} — ` : ''}${option.label}` }
    })
  }, [courses, departmentId, levelId, semesterId])

  if (!open) return null

  const canSubmit = courseId !== '' && docType !== '' && !saving

  const pick = (setter, resetAfter = []) => (event) => {
    setter(event.target.value)
    setSaveError(null)
    resetAfter.forEach(([clear, value]) => clear(value))
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setSaveError(null)
    try {
      await onConfirm({ courseId: Number(courseId), docType })
    } catch (err) {
      setSaveError(err?.message || 'Enregistrement impossible. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="ax-sheet-overlay" role="presentation" onClick={onClose}>
      <section
        className="ax-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Sélectionner votre cours"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ax-sheet__header">
          <span className="ax-sheet__grab" aria-hidden="true" />
          <h2 className="ax-sheet__title">Précisez votre cours</h2>
          <button type="button" className="ax-icon-btn ax-icon-btn--sm" onClick={onClose} aria-label="Fermer">✕</button>
        </header>
        <div className="ax-sheet__body">
          <div className="ax-alert ax-alert--warning" role="alert" style={{ marginBottom: 'var(--ax-space-4)' }}>
            <p style={{ margin: 0 }}>
              Nous n&apos;avons pas pu identifier le cours automatiquement. Sélectionnez votre cours dans la liste :
            </p>
            {target?.fileName && (
              <p className="ax-text--muted ax-text--sm" style={{ margin: 'var(--ax-space-1) 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📎 {target.fileName}
              </p>
            )}
          </div>

          {loading && <p className="ax-text--muted">Chargement des listes...</p>}
          {loadError && (
            <div className="ax-alert ax-alert--error" role="alert">
              <p style={{ margin: 0 }}>{loadError}</p>
            </div>
          )}

          {!loading && !loadError && (
            <div className="ax-form-stack">
              <div className="ax-form-group">
                <label className="ax-form-group__label" htmlFor="up-m-faculty">Faculté</label>
                <select
                  id="up-m-faculty"
                  className="ax-form-group__input"
                  value={facultyId}
                  onChange={pick(setFacultyId, [[setDepartmentId, ''], [setLevelId, ''], [setSemesterId, ''], [setCourseId, '']])}
                >
                  <option value="">— Choisir la faculté —</option>
                  {toSelectOptions(faculties).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="ax-form-group">
                <label className="ax-form-group__label" htmlFor="up-m-department">Département</label>
                <select
                  id="up-m-department"
                  className="ax-form-group__input"
                  value={departmentId}
                  onChange={pick(setDepartmentId, [[setLevelId, ''], [setSemesterId, ''], [setCourseId, '']])}
                >
                  <option value="">— Choisir le département —</option>
                  {toSelectOptions(departmentOptions).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="ax-form-group">
                <label className="ax-form-group__label" htmlFor="up-m-level">Niveau</label>
                <select
                  id="up-m-level"
                  className="ax-form-group__input"
                  value={levelId}
                  onChange={pick(setLevelId, [[setSemesterId, ''], [setCourseId, '']])}
                >
                  <option value="">— Choisir le niveau (ex : BAC 3) —</option>
                  {toSelectOptions(levelOptions).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="ax-form-group">
                <label className="ax-form-group__label" htmlFor="up-m-semester">Semestre</label>
                <select
                  id="up-m-semester"
                  className="ax-form-group__input"
                  value={semesterId}
                  onChange={pick(setSemesterId, [[setCourseId, '']])}
                >
                  <option value="">— Choisir le semestre —</option>
                  {semesterOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="ax-form-group">
                <label className="ax-form-group__label" htmlFor="up-m-course">Cours</label>
                <select
                  id="up-m-course"
                  className="ax-form-group__input"
                  value={courseId}
                  onChange={pick(setCourseId)}
                >
                  <option value="">{courseOptions.length === 0 ? '— Aucun cours pour cette sélection —' : '— Choisir le cours —'}</option>
                  {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="ax-form-group__label" style={{ marginBottom: 'var(--ax-space-2)' }}>Type de document</legend>
                <div className="ax-filters-chips" role="group" aria-label="Type de document" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
                  {UPLOAD_CLASSIFY_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`ax-filter-chip ax-filter-chip--mobile${docType === t.value ? ' ax-filter-chip--active' : ''}`}
                      aria-pressed={docType === t.value}
                      onClick={() => { setDocType(t.value); setSaveError(null) }}
                    >
                      <span aria-hidden="true">{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {saveError && (
            <div className="ax-alert ax-alert--error" role="alert" style={{ marginTop: 'var(--ax-space-3)' }}>
              <p style={{ margin: 0 }}>{saveError}</p>
            </div>
          )}
        </div>

        <footer className="ax-sheet__footer">
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--md" onClick={onClose}>
            Plus tard
          </button>
          <button
            type="button"
            className="ax-btn ax-btn--primary ax-btn--md"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
