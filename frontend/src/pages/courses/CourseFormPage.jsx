/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Course Form Page
 * ---------------------------------------------------------------------------
 * Creation / modification d'un cours avec validation Laravel (statut 422).
 * Le backend n'exposant pas de `GET /courses/:id`, l'edition se pre-remplit
 * depuis l'objet cours transmis via le state de navigation (liste page).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { CourseApi } from '../../api/CourseApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { SemesterApi } from '../../api/SemesterApi'
import { useNotification } from '../../hooks/useNotification'
import { useAuth } from '../../hooks/useAuth'
import { hasAdminAccess, hasDelegateAccess } from '../../utils/admin'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import { normalizeApiList, toSelectOptions, slugify, semesterOptionsForLevel } from '../../utils/academic'

/**
 * Construit les valeurs initiales du formulaire depuis l'objet cours recu.
 * @param {object|null} course - Objet cours transmis via le state de route.
 * @returns {object} Valeurs initiales exploitables par le formulaire.
 */
function buildInitialValues(course) {
  return {
    departmentId: course?.department_id ?? course?.department?.id ?? '',
    levelId: course?.level_id ?? course?.level?.id ?? '',
    semesterId: course?.semester_id ?? course?.semester?.id ?? '',
    name: course?.title || course?.name || '',
    code: course?.code || '',
    description: course?.description || '',
    credits: course?.credits ?? '',
    coefficient: course?.coefficient ?? '',
    hours: course?.hours ?? '',
    teacher: course?.teacher || '',
    status: course?.status !== false,
  }
}

/**
 * Page de creation / modification d'un cours.
 * @returns {import('react').JSX.Element}
 */
export default function CourseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotification()
  const location = useLocation()
  const editingCourse = location.state?.course
  const isEditing = Boolean(id) && Boolean(editingCourse)
  const { user } = useAuth()
  // Creation / modification : admins + delegues (perimetre impose). Etudiants refuses.
  const canManage = hasAdminAccess(user) || hasDelegateAccess(user)
  // Delegue (non-admin) : departement impose = le sien (backend revalide).
  const isScopedDelegate = hasDelegateAccess(user) && !hasAdminAccess(user)
  const scopedDepartmentId = isScopedDelegate && user?.department_id != null
    ? String(user.department_id)
    : (location.state?.presetDepartmentId != null ? String(location.state.presetDepartmentId) : '')

  const [departments, setDepartments] = useState([])
  const [levels, setLevels] = useState([])
  const [semesters, setSemesters] = useState([])
  const scopedLevelId = isScopedDelegate && user?.level_id != null ? String(user.level_id) : ''
  const [formData, setFormData] = useState(() => {
    const initial = buildInitialValues(editingCourse)
    if (scopedDepartmentId && !initial.departmentId) initial.departmentId = scopedDepartmentId
    if (scopedLevelId && !initial.levelId) initial.levelId = scopedLevelId
    return initial
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delegue : departement et classe imposes (selects desactives + garde de saisie).
  const isDepartmentLocked = Boolean(isScopedDelegate && scopedDepartmentId)
  const isLevelLocked = Boolean(isScopedDelegate && scopedLevelId)
  // Edition hors perimetre (ex. lien direct vers un cours d'une autre classe).
  const editDept = editingCourse?.department_id ?? editingCourse?.department?.id
  const editLevel = editingCourse?.level_id ?? editingCourse?.level?.id
  const isOutOfScope = Boolean(
    isEditing && isScopedDelegate && (
      (editDept == null || user?.department_id == null || String(editDept) !== String(user.department_id)) ||
      (user?.level_id != null && (editLevel == null || String(editLevel) !== String(user.level_id)))
    ),
  )

  // Edition impossible sans objet deja charge (aucun GET /courses/:id).
  useEffect(() => {
    if (!id) return
    if (!editingCourse) {
      notify.error('Modification indisponible : rouvrez le cours depuis la liste.')
      navigate(ROUTE_PATHS.COURSES)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lancement unique
  }, [id])

  // References de selection (departements / niveaux / semestres).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const deptRes = await DepartmentApi.list()
        const levelRes = await LevelApi.list()
        const semRes = await SemesterApi.list()
        if (cancelled) return
        setDepartments(normalizeApiList(deptRes))
        setLevels(normalizeApiList(levelRes))
        setSemesters(normalizeApiList(semRes))
      } catch {
        if (!cancelled) {
          setDepartments([])
          setLevels([])
          setSemesters([])
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'departmentId' && isDepartmentLocked) return
    if (name === 'levelId' && isLevelLocked) return
    setFormData((prev) => {
      if (name === 'status') return { ...prev, status: value === '1' }
      // Si on change de niveau, le semestre reste S1/S2 mais son label global change (BAC3: 5/6)
      if (name === 'levelId') {
        // invalide semester si plus cohérent? On garde mais on clear l'erreur semestre
        return { ...prev, [name]: value }
      }
      return { ...prev, [name]: value }
    })
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        if (name === 'levelId') delete next.semester_id
        return next
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setIsSubmitting(true)

    const numericOrUndef = (value) => (value === '' ? undefined : Number(value))

    const payload = {
      department_id: Number(formData.departmentId),
      level_id: Number(formData.levelId),
      semester_id: Number(formData.semesterId),
      name: formData.name.trim(),
      code: formData.code.trim(),
      slug: slugify(formData.code.trim()),
      description: formData.description.trim() || undefined,
      credits: numericOrUndef(formData.credits),
      coefficient: numericOrUndef(formData.coefficient),
      hours: numericOrUndef(formData.hours),
      teacher: formData.teacher.trim() || undefined,
      status: formData.status,
    }

    try {
      if (isEditing) {
        await CourseApi.update(id, payload)
        notify.success('Cours mis a jour avec succes.')
      } else {
        await CourseApi.create(payload)
        notify.success('Cours cree avec succes.')
      }
      navigate(ROUTE_PATHS.COURSES)
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors)
      } else {
        notify.error(err?.message || 'Une erreur est survenue.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const departmentOptions = toSelectOptions(departments)
  const levelOptions = toSelectOptions(levels)
  const selectedLevelCode = levels.find((l) => String(l.id) === String(formData.levelId))?.code || ''
  const semesterOptions = semesterOptionsForLevel(semesters, selectedLevelCode).map((o) => ({ value: o.value, label: o.label }))

  if (!canManage || isOutOfScope) {
    return (
      <Container size="sm">
        <PageHeader
          title="Acces refuse"
          subtitle={isOutOfScope
            ? "Ce cours n'appartient pas a votre departement / classe"
            : 'Creation et modification reservees aux administrateurs et delegues'}
        />
        <div className="ax-card ax-card--padded" role="alert">
          <p>
            {isOutOfScope
              ? "En tant que delegue, vous ne pouvez modifier que les cours de votre departement et de votre classe."
              : 'Votre compte ne dispose pas des privileges requis pour gerer les cours.'}
          </p>
          <Button variant="primary" size="md" onClick={() => navigate(ROUTE_PATHS.COURSES)}>
            Retour aux cours
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container size="sm">
      <PageHeader
        title={isEditing ? 'Modifier le cours' : 'Nouveau cours'}
        subtitle={isEditing ? `Modification de "${formData.name}"` : 'Remplissez les informations ci-dessous'}
      />

      <form className="ax-card ax-card--padded" onSubmit={handleSubmit}>
        <div className="ax-form-stack">
          {/* Departement */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-department">
              Departement <span className="ax-form-group__required">*</span>
            </label>
            <select
              id="course-department"
              name="departmentId"
              className={`ax-form-group__input ${errors.department_id ? 'ax-form-group__input--error' : ''}`}
              value={formData.departmentId}
              onChange={handleChange}
              required
              disabled={isDepartmentLocked}
            >
              <option value="">Selectionnez un departement...</option>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {isDepartmentLocked && (
              <span className="ax-text--muted ax-text--xs">Département imposé : votre périmètre de délégué.</span>
            )}
            {errors.department_id && (
              <span className="ax-form-group__error">{errors.department_id[0]}</span>
            )}
          </div>

          {/* Niveau */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-level">
              Niveau <span className="ax-form-group__required">*</span>
            </label>
            <select
              id="course-level"
              name="levelId"
              className={`ax-form-group__input ${errors.level_id ? 'ax-form-group__input--error' : ''}`}
              value={formData.levelId}
              onChange={handleChange}
              required
              disabled={isLevelLocked}
            >
              <option value="">Selectionnez un niveau...</option>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {isLevelLocked && (
              <span className="ax-text--muted ax-text--xs">Classe imposée : votre périmètre de délégué.</span>
            )}
            {errors.level_id && (
              <span className="ax-form-group__error">{errors.level_id[0]}</span>
            )}
          </div>

          {/* Semestre — label global selon niveau (BAC3: Semestre 5/6) */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-semester">
              Semestre <span className="ax-form-group__required">*</span>
              {selectedLevelCode ? <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--ax-text-tertiary)' }}>({selectedLevelCode} → {selectedLevelCode.match(/^BAC(\d+)$/) ? `Semestres ${(Number(selectedLevelCode.replace('BAC',''))-1)*2+1} / ${(Number(selectedLevelCode.replace('BAC',''))-1)*2+2}` : ''})</span> : null}
            </label>
            <select
              id="course-semester"
              name="semesterId"
              className={`ax-form-group__input ${errors.semester_id ? 'ax-form-group__input--error' : ''}`}
              value={formData.semesterId}
              onChange={handleChange}
              required
            >
              <option value="">Selectionnez un semestre...</option>
              {semesterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}{selectedLevelCode ? ` (${semesters.find(s=>String(s.id)===String(option.value))?.code || ''})` : ''}</option>
              ))}
            </select>
            {errors.semester_id && (
              <span className="ax-form-group__error">{errors.semester_id[0]}</span>
            )}
            {selectedLevelCode && /^BAC(\d+)$/.test(selectedLevelCode) && (
              <span className="ax-text--muted ax-text--xs">BAC3 = Semestre 5 (S1) ou 6 (S2), pas 1/2.</span>
            )}
          </div>

          {/* Nom */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-name">
              Nom <span className="ax-form-group__required">*</span>
            </label>
            <input
              id="course-name"
              name="name"
              className={`ax-form-group__input ${errors.name ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: Chimie Organique III"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
            {errors.name && (
              <span className="ax-form-group__error">{errors.name[0]}</span>
            )}
          </div>

          {/* Code */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-code">
              Code <span className="ax-form-group__required">*</span>
            </label>
            <input
              id="course-code"
              name="code"
              className={`ax-form-group__input ${errors.code ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: CHI3509"
              value={formData.code}
              onChange={handleChange}
              required
              maxLength={50}
            />
            {errors.code && (
              <span className="ax-form-group__error">{errors.code[0]}</span>
            )}
            {errors.slug && (
              <span className="ax-form-group__error">{errors.slug[0]}</span>
            )}
          </div>

          {/* Description */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-description">
              Description
            </label>
            <textarea
              id="course-description"
              name="description"
              className={`ax-form-group__input ax-form-group__textarea ${errors.description ? 'ax-form-group__input--error' : ''}`}
              placeholder="Description du cours..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
            {errors.description && (
              <span className="ax-form-group__error">{errors.description[0]}</span>
            )}
          </div>

          {/* Credits ECTS */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-credits">
              Credits ECTS
            </label>
            <input
              id="course-credits"
              name="credits"
              className={`ax-form-group__input ${errors.credits ? 'ax-form-group__input--error' : ''}`}
              type="number"
              min="0"
              max="32767"
              placeholder="Ex: 5"
              value={formData.credits}
              onChange={handleChange}
            />
            {errors.credits && (
              <span className="ax-form-group__error">{errors.credits[0]}</span>
            )}
          </div>

          {/* Coefficient */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-coefficient">
              Coefficient
            </label>
            <input
              id="course-coefficient"
              name="coefficient"
              className={`ax-form-group__input ${errors.coefficient ? 'ax-form-group__input--error' : ''}`}
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 2.5"
              value={formData.coefficient}
              onChange={handleChange}
            />
            {errors.coefficient && (
              <span className="ax-form-group__error">{errors.coefficient[0]}</span>
            )}
          </div>

          {/* Heures */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-hours">
              Volume horaire
            </label>
            <input
              id="course-hours"
              name="hours"
              className={`ax-form-group__input ${errors.hours ? 'ax-form-group__input--error' : ''}`}
              type="number"
              min="0"
              max="32767"
              placeholder="Ex: 45"
              value={formData.hours}
              onChange={handleChange}
            />
            {errors.hours && (
              <span className="ax-form-group__error">{errors.hours[0]}</span>
            )}
          </div>

          {/* Enseignant */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-teacher">
              Enseignant
            </label>
            <input
              id="course-teacher"
              name="teacher"
              className={`ax-form-group__input ${errors.teacher ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: Prof. A. Dupont"
              value={formData.teacher}
              onChange={handleChange}
              maxLength={255}
            />
            {errors.teacher && (
              <span className="ax-form-group__error">{errors.teacher[0]}</span>
            )}
          </div>

          {/* Statut */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-status">
              Statut
            </label>
            <select
              id="course-status"
              name="status"
              className={`ax-form-group__input ${errors.status ? 'ax-form-group__input--error' : ''}`}
              value={formData.status ? '1' : '0'}
              onChange={handleChange}
            >
              <option value="1">Actif</option>
              <option value="0">Inactif</option>
            </select>
            {errors.status && (
              <span className="ax-form-group__error">{errors.status[0]}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ax-form-actions">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate(ROUTE_PATHS.COURSES)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
          >
            {isEditing ? 'Mettre a jour' : 'Creer le cours'}
          </Button>
        </div>
      </form>
    </Container>
  )
}