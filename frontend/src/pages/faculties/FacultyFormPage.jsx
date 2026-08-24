/**
 * ALPHIX V2 — Faculty Form Page
 * Create/Edit faculte avec validation Laravel.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FacultyApi } from '../../api/FacultyApi'
import { useNotification } from '../../hooks/useNotification'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'

/**
 * @returns {import('react').JSX.Element}
 */
export default function FacultyFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotification()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({ name: '', code: '', description: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function run() {
      try {
        const data = await FacultyApi.get(id)
        if (cancelled) return
        setFormData({
          name: data?.name || '',
          code: data?.code || '',
          description: data?.description || '',
        })
      } catch (err) {
        if (!cancelled) {
          notify.error(err?.message || 'Erreur lors du chargement de la faculte.')
          navigate(ROUTE_PATHS.FACULTIES)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [id, navigate, notify])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
      name: formData.name.trim(),
      code: formData.code.trim() || undefined,
      description: formData.description.trim() || undefined,
    }

    try {
      if (isEditing) {
        await FacultyApi.update(id, payload)
        notify.success('Faculte mise a jour avec succes.')
      } else {
        await FacultyApi.create(payload)
        notify.success('Faculte creee avec succes.')
      }
      navigate(ROUTE_PATHS.FACULTIES)
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
        title={isEditing ? 'Modifier la faculte' : 'Nouvelle faculte'}
        subtitle={isEditing ? `Modification de "${formData.name}"` : 'Remplissez les informations ci-dessous'}
      />

      <form className="ax-card ax-card--padded" onSubmit={handleSubmit}>
        <div className="ax-form-stack">
          {/* Name */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="faculty-name">
              Nom <span className="ax-form-group__required">*</span>
            </label>
            <input
              id="faculty-name"
              name="name"
              className={`ax-form-group__input ${errors.name ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: Faculte des Sciences"
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
            <label className="ax-form-group__label" htmlFor="faculty-code">
              Code
            </label>
            <input
              id="faculty-code"
              name="code"
              className={`ax-form-group__input ${errors.code ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: FS"
              value={formData.code}
              onChange={handleChange}
              maxLength={20}
            />
            {errors.code && (
              <span className="ax-form-group__error">{errors.code[0]}</span>
            )}
          </div>

          {/* Description */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="faculty-description">
              Description
            </label>
            <textarea
              id="faculty-description"
              name="description"
              className={`ax-form-group__input ax-form-group__textarea ${errors.description ? 'ax-form-group__input--error' : ''}`}
              placeholder="Description de la faculte..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
            {errors.description && (
              <span className="ax-form-group__error">{errors.description[0]}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ax-form-actions">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate(ROUTE_PATHS.FACULTIES)}
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
            {isEditing ? 'Mettre a jour' : 'Creer la faculte'}
          </Button>
        </div>
      </form>
    </Container>
  )
}
