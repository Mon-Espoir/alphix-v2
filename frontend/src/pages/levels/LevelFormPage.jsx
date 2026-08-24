/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Level Form Page
 * ---------------------------------------------------------------------------
 * Creation / modification d'un niveau avec validation Laravel (statut 422).
 * Champs back requis : name, code, slug (genere), position (ordre), status.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LevelApi } from '../../api/LevelApi'
import { useNotification } from '../../hooks/useNotification'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import { slugify } from '../../utils/academic'

/**
 * Page de creation / modification d'un niveau.
 * @returns {import('react').JSX.Element}
 */
export default function LevelFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotification()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    position: 1,
    status: true,
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function run() {
      try {
        const data = await LevelApi.get(id)
        if (cancelled) return
        setFormData({
          name: data?.name || '',
          code: data?.code || '',
          position: data?.position ?? 1,
          status: data?.status !== false,
        })
        setErrors({})
      } catch (err) {
        if (!cancelled) {
          notify.error(err?.message || 'Erreur lors du chargement du niveau.')
          navigate(ROUTE_PATHS.LEVELS)
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
    setFormData((prev) => {
      if (name === 'status') return { ...prev, status: value === '1' }
      if (name === 'position') return { ...prev, position: value === '' ? '' : Number(value) }
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
      name: formData.name.trim(),
      code: formData.code.trim(),
      slug: slugify(formData.code.trim()),
      position: formData.position,
      status: formData.status,
    }

    try {
      if (isEditing) {
        await LevelApi.update(id, payload)
        notify.success('Niveau mis a jour avec succes.')
      } else {
        await LevelApi.create(payload)
        notify.success('Niveau cree avec succes.')
      }
      navigate(ROUTE_PATHS.LEVELS)
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
        title={isEditing ? 'Modifier le niveau' : 'Nouveau niveau'}
        subtitle={isEditing ? `Modification de "${formData.name}"` : 'Remplissez les informations ci-dessous'}
      />

      <form className="ax-card ax-card--padded" onSubmit={handleSubmit}>
        <div className="ax-form-stack">
          {/* Nom */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="level-name">
              Nom <span className="ax-form-group__required">*</span>
            </label>
            <input
              id="level-name"
              name="name"
              className={`ax-form-group__input ${errors.name ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: Baccalaureat 3"
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
            <label className="ax-form-group__label" htmlFor="level-code">
              Code <span className="ax-form-group__required">*</span>
            </label>
            <input
              id="level-code"
              name="code"
              className={`ax-form-group__input ${errors.code ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Ex: BAC3"
              value={formData.code}
              onChange={handleChange}
              required
              maxLength={30}
            />
            {errors.code && (
              <span className="ax-form-group__error">{errors.code[0]}</span>
            )}
          </div>

          {/* Code (auto-slug) hint */}
          {errors.slug && (
            <span className="ax-form-group__error">{errors.slug[0]}</span>
          )}

          {/* Ordre */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="level-position">
              Ordre
            </label>
            <input
              id="level-position"
              name="position"
              className={`ax-form-group__input ${errors.position ? 'ax-form-group__input--error' : ''}`}
              type="number"
              min="0"
              max="65535"
              placeholder="Ex: 1"
              value={formData.position}
              onChange={handleChange}
            />
            {errors.position && (
              <span className="ax-form-group__error">{errors.position[0]}</span>
            )}
          </div>

          {/* Statut */}
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="level-status">
              Statut
            </label>
            <select
              id="level-status"
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
            onClick={() => navigate(ROUTE_PATHS.LEVELS)}
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
            {isEditing ? 'Mettre a jour' : 'Creer le niveau'}
          </Button>
        </div>
      </form>
    </Container>
  )
}