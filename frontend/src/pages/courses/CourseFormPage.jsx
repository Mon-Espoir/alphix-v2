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
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import { normalizeApiList, toSelectOptions, slugify } from '../../utils/academic'

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

  const [departments, setDepartments] = useState([])
  const [levels, setLevels] = useState([])
  const [semesters, setSemesters] = useState([])
  const [formData, setFormData] = useState(() => buildInitialValues(editingCourse))
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setFormData((prev) => {
      if (name === 'status') return { ...prev, status: value === '1' }
      return { ...prev, [name]: value }
    })
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
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
  const semesterOptions = toSelectOptions(semesters)

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
            >
              <option value="">Selectionnez un departement...</option>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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
            >
              <option value="">Selectionnez un niveau...</option>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.level_id && (
              <span className="ax-form-group__error">{errors.level_id[0]}</span>
            )}
          </div>

          {/* Semestre */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-semester">
              Semestre <span className="ax-form-group__required">*</span>
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
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.semester_id && (
              <span className="ax-form-group__error">{errors.semester_id[0]}</span>
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