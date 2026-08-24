/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Department Form Page
 * ---------------------------------------------------------------------------
 * Creation / modification d'un departement avec gestion des erreurs de
 * validation Laravel (statut 422). Champs lies : Department -> Faculty.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DepartmentApi } from '../../api/DepartmentApi'
import { FacultyApi } from '../../api/FacultyApi'
import { useNotification } from '../../hooks/useNotification'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import { normalizeApiList, toSelectOptions, slugify } from '../../utils/academic'

/**
 * Page de creation / modification d'un departement.
 * @returns {import('react').JSX.Element}
 */
export default function DepartmentFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotification()
  const isEditing = Boolean(id)

  const [faculties, setFaculties] = useState([])
  const [formData, setFormData] = useState({
    facultyId: '',
    name: '',
    code: '',
    shortName: '',
    description: '',
    status: true,
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reference : facultes selectionnables (relation Department -> Faculty).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = await FacultyApi.list()
        if (cancelled) return
        setFaculties(normalizeApiList(response))
      } catch {
        if (!cancelled) setFaculties([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function run() {
      try {
        const data = await DepartmentApi.get(id)
        if (cancelled) return
        setFormData({
          facultyId: data?.faculty_id ?? '',
          name: data?.name || '',
          code: data?.code || '',
          shortName: data?.short_name || '',
          description: data?.description || '',
          status: data?.status !== false,
        })
        setErrors({})
      } catch (err) {
        if (!cancelled) {
          notify.error(err?.message || 'Erreur lors du chargement du departement.')
          navigate(ROUTE_PATHS.DEPARTMENTS)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigation unique au montage
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'status') {
        return { ...prev, status: value === '1' }
      }
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

    const payload = {
      faculty_id: Number(formData.facultyId),
      name: formData.name.trim(),
      code: formData.code.trim(),
      slug: slugify(formData.code.trim()),
      short_name: formData.shortName.trim() || undefined,
      description: formData.description.trim() || undefined,
      status: formData.status,
    }

    try {
      if (isEditing) {
        await DepartmentApi.update(id, payload)
        notify.success('Departement mis a jour avec succes.')
      } else {
        await DepartmentApi.create(payload)
        notify.success('Departement cree avec succes.')
      }
      navigate(ROUTE_PATHS.DEPARTMENTS)
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

  const facultyOptions = toSelectOptions(faculties)

  if (isLoading) {
    return (
      <Container size="sm">
        <div style={{ padding: 'var(--ax-space-12) 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--ax-text-secondary)' }}>Chargement...</p>
        </div>
      </Container>
    )
  }

  return (
    <Container size="sm">
      <PageHeader
        title={isEditing ? 'Modifier le departement' : 'Nouveau departement'}
        subtitle={isEditing ? `Modification de "${formData.name}"` : 'Remplissez les informations ci-dessous'}
      />

      <form className="ax-card ax-card--padded" onSubmit={handleSubmit}>
        <div className="ax-form-stack">
          {/* Faculte rattachee */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="department-faculty">
              Faculte <span className="ax-form-group__required">*</span>
            </label>
            <select
              id="department-faculty"
              name="facultyId"
              className={`ax-form-group__input ${errors.faculty_id ? 'ax-form-group__input--error' : ''}`}
              value={formData.facultyId}
              onChange={handleChange}
              required
            >
              <option value="">Selectionnez une faculte...</option>
              {facultyOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.faculty_id && (
              <span className="ax-form-group__error">{errors.faculty_id[0]}</span>
            )}
          </div>

          {/* Nom */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="department-name">
              Nom <span className="ax-form-group__required">*</span>
            </label>
            <input
              id="department-name"
              name="name"
              className={`ax-form-group__input ${errors.name ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: Departement Informatique"
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
            <label className="ax-form-group__label" htmlFor="department-code">
              Code <span className="ax-form-group__required">*</span>
            </label>
            <input
              id="department-code"
              name="code"
              className={`ax-form-group__input ${errors.code ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: INF"
              value={formData.code}
              onChange={handleChange}
              required
              maxLength={30}
            />
            {errors.code && (
              <span className="ax-form-group__error">{errors.code[0]}</span>
            )}
          </div>

          {/* Nom court */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="department-short-name">
              Nom court
            </label>
            <input
              id="department-short-name"
              name="shortName"
              className={`ax-form-group__input ${errors.short_name ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: INFO"
              value={formData.shortName}
              onChange={handleChange}
              maxLength={100}
            />
            {errors.short_name && (
              <span className="ax-form-group__error">{errors.short_name[0]}</span>
            )}
          </div>

          {/* Description */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="department-description">
              Description
            </label>
            <textarea
              id="department-description"
              name="description"
              className={`ax-form-group__input ax-form-group__textarea ${errors.description ? 'ax-form-group__input--error' : ''}`}
              placeholder="Description du departement..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
            {errors.description && (
              <span className="ax-form-group__error">{errors.description[0]}</span>
            )}
          </div>

          {/* Statut */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="department-status">
              Statut
            </label>
            <select
              id="department-status"
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
            onClick={() => navigate(ROUTE_PATHS.DEPARTMENTS)}
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
            {isEditing ? 'Mettre a jour' : 'Creer le departement'}
          </Button>
        </div>
      </form>
    </Container>
  )
}