/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Document Form Page
 * ---------------------------------------------------------------------------
 * Creation / edition de document : parsing strict des erreurs Laravel 422,
 * selecteur dynamique de tags, visibilite, statut, integration du lien
 * source Google Drive. Empreinte SHA-256 calculee localement via Web Crypto.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentApi } from '../../api/DocumentApi'
import { DocumentTagApi } from '../../api/DocumentTagApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { CourseApi } from '../../api/CourseApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import { useNotification } from '../../hooks/useNotification'
import { normalizeApiList, slugify } from '../../utils/academic'
import { DOC_TYPES, DOC_STATUSES, DOC_VISIBILITIES, documentTitle } from '../../utils/document'

/**
 * Calcule l'empreinte SHA-256 hexadecimale d'un fichier.
 * @param {File} file - Fichier selectionne.
 * @returns {Promise<string>} Empreinte hex (64 caracteres).
 */
async function computeSha256(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Page de creation / edition d'un document.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotification()
  const isEditing = Boolean(id)

  const [courses, setCourses] = useState([])
  const [tags, setTags] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    originalName: '',
    description: '',
    docType: 'course',
    courseId: '',
    academicYear: '',
    language: 'fr',
    pages: '',
    visibility: 'public',
    status: 'pending',
    isFeatured: false,
    tagIds: [],
    driveUrl: '',
  })
  const [fileInfo, setFileInfo] = useState(null)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [isSubmitting, setIsSubmitting] = useState(false)

  // References (echecs silencieux non bloquants).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const depList = normalizeApiList(await DepartmentApi.list())
        const firstDepartment = depList[0]
        if (firstDepartment?.id != null) {
          const courseList = normalizeApiList(await CourseApi.getByDepartment(firstDepartment.id))
          if (!cancelled) setCourses(courseList)
        }
      } catch {
        // References manquantes : formulaire degrade mais fonctionnel.
      }
      try {
        const tagList = normalizeApiList(await DocumentTagApi.list())
        if (!cancelled) setTags(tagList)
      } catch {
        if (!cancelled) setTags([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Pre-remplissage en edition (show + tags dedies).
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function run() {
      setIsLoading(true)
      try {
        const data = await DocumentApi.get(id)
        let loadedTags = []
        try {
          loadedTags = normalizeApiList(await DocumentTagApi.getByDocument(id))
        } catch {
          loadedTags = []
        }
        if (cancelled) return
        const metadataList = Array.isArray(data?.metadata) ? data.metadata : []
        const sourceEntry = metadataList.find((entry) => String(entry).startsWith('source_url:')) || ''
        setFormData({
          title: documentTitle(data) === '-' ? '' : data.title,
          originalName: data?.original_name || '',
          description: data?.description || '',
          docType: data?.doc_type || 'other',
          courseId: data?.course?.id ?? '',
          academicYear: data?.academic_year || '',
          language: data?.language || '',
          pages: data?.pages ?? '',
          visibility: data?.visibility || 'public',
          status: data?.status || 'pending',
          isFeatured: Boolean(data?.is_featured),
          tagIds: loadedTags.map((tag) => tag.id),
          driveUrl: String(sourceEntry).replace('source_url:', ''),
        })
      } catch (err) {
        if (!cancelled) {
          notify.error(err?.message || 'Erreur lors du chargement du document.')
          navigate(ROUTE_PATHS.DOCUMENTS)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [id, navigate, notify])

  /**
   * Selection de fichier : derive nom original, MIME, taille et SHA-256.
   * @param {object} event - Evenement input file.
   */
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFormData((prev) => ({ ...prev, originalName: file.name }))
    try {
      const hash = await computeSha256(file)
      setFileInfo({
        hash,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        name: file.name,
      })
    } catch {
      setFileInfo(null)
      notify.error('Impossible de lire le fichier pour calculer son empreinte.')
    }
  }

  /**
   * Changement generique de champ (texte / select / checkbox).
   * @param {object} event - Evenement de changement.
   */
  const handleChange = (event) => {
    const target = event.target
    const value = target.type === 'checkbox' ? target.checked : target.value
    setFormData((prev) => ({ ...prev, [target.name]: value }))
    if (errors[target.name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[target.name]
        return next
      })
    }
  }

  /**
   * Bascule d'un tag dans la selection courante.
   * @param {number|string} tagId - Identifiant du tag.
   */
  const toggleTag = (tagId) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((current) => current !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setIsSubmitting(true)

    if (!isEditing && !formData.originalName.trim()) {
      setErrors({ original_name: ['Le nom original du fichier est obligatoire.'] })
      setIsSubmitting(false)
      return
    }

    const payload = {
      course_id: formData.courseId ? Number(formData.courseId) : undefined,
      title: formData.title.trim(),
      original_name: fileInfo?.name || formData.originalName.trim(),
      slug: slugify(formData.title.trim()) || `document-${Date.now()}`,
      description: formData.description.trim() || undefined,
      doc_type: formData.docType,
      academic_year: formData.academicYear.trim() || undefined,
      language: formData.language.trim() || undefined,
      pages: formData.pages === '' ? undefined : Number(formData.pages),
      file_size: fileInfo ? fileInfo.fileSize : undefined,
      file_hash: fileInfo ? fileInfo.hash : undefined,
      visibility: formData.visibility,
      status: formData.status || undefined,
      is_featured: Boolean(formData.isFeatured),
      tags: formData.tagIds.length > 0 ? formData.tagIds.map(Number) : undefined,
      metadata: formData.driveUrl.trim() ? [`source_url:${formData.driveUrl.trim()}`] : undefined,
    }

    try {
      if (isEditing) {
        await DocumentApi.update(id, payload)
        notify.success('Document mis a jour avec succes.')
      } else {
        await DocumentApi.create(payload)
        notify.success('Document cree avec succes.')
      }
      navigate(ROUTE_PATHS.DOCUMENTS)
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

  /**
   * Premier message d'erreur Laravel pour une cle donnee.
   * @param {string} key - Cle de validation.
   * @returns {string|null} Message ou null.
   */
  const errorTextFor = (key) => (errors[key] ? errors[key][0] : null)

  return (
    <Container size="sm">
      <PageHeader
        title={isEditing ? 'Modifier le document' : 'Nouveau document'}
        subtitle={isEditing ? 'Mise a jour des informations' : 'Renseignez la fiche et selectionnez le fichier'}
      />

      {isLoading && (
        <div style={{ padding: 'var(--ax-space-12) 0', textAlign: 'center' }} role="status">
          <p style={{ color: 'var(--ax-text-secondary)' }}>Chargement...</p>
        </div>
      )}

      {!isLoading && (
        <form className="ax-card ax-card--padded" onSubmit={handleSubmit}>
          <div className="ax-form-stack">
            {/* Fichier source (creation uniquement : le hash est immuable ensuite) */}
            {!isEditing && (
              <div className="ax-form-group">
                <label className="ax-form-group__label" htmlFor="document-file">
                  Fichier <span className="ax-form-group__required">*</span>
                </label>
                <input
                  id="document-file"
                  className={`ax-form-group__input ${errors.file_hash ? 'ax-form-group__input--error' : ''}`}
                  type="file"
                  onChange={handleFileChange}
                  required
                />
                {fileInfo ? (
                  <Badge variant="primary" size="sm">Empreinte SHA-256 calculee</Badge>
                ) : null}
                {errorTextFor('original_name') && (
                  <span className="ax-form-group__error">{errorTextFor('original_name')}</span>
                )}
              </div>
            )}

            {/* Titre */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-title">
                Titre <span className="ax-form-group__required">*</span>
              </label>
              <input
                id="document-title"
                name="title"
                className={`ax-form-group__input ${errors.title ? 'ax-form-group__input--error' : ''}`}
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                autoFocus
              />
              {errorTextFor('title') && <span className="ax-form-group__error">{errorTextFor('title')}</span>}
            </div>

            {/* Type de document */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-type">
                Type <span className="ax-form-group__required">*</span>
              </label>
              <select
                id="document-type"
                name="docType"
                className={`ax-form-group__input ${errors.doc_type ? 'ax-form-group__input--error' : ''}`}
                value={formData.docType}
                onChange={handleChange}
                required
              >
                {DOC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errorTextFor('doc_type') && <span className="ax-form-group__error">{errorTextFor('doc_type')}</span>}
            </div>

            {/* Cours rattache */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-course">Cours</label>
              <select
                id="document-course"
                name="courseId"
                className={`ax-form-group__input ${errors.course_id ? 'ax-form-group__input--error' : ''}`}
                value={formData.courseId}
                onChange={handleChange}
              >
                <option value="">Aucun cours</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title || course.name}</option>
                ))}
              </select>
              {errorTextFor('course_id') && <span className="ax-form-group__error">{errorTextFor('course_id')}</span>}
            </div>

            {/* Description */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-description">Description</label>
              <textarea
                id="document-description"
                name="description"
                className="ax-form-group__input ax-form-group__textarea"
                rows={4}
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Annee academique */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-year">Annee academique</label>
              <input
                id="document-year"
                name="academicYear"
                className="ax-form-group__input"
                type="text"
                placeholder="Ex: 2025-2026"
                maxLength={20}
                value={formData.academicYear}
                onChange={handleChange}
              />
              {errorTextFor('academic_year') && (
                <span className="ax-form-group__error">{errorTextFor('academic_year')}</span>
              )}
            </div>

            {/* Langue */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-language">Langue</label>
              <input
                id="document-language"
                name="language"
                className="ax-form-group__input"
                type="text"
                maxLength={20}
                value={formData.language}
                onChange={handleChange}
              />
            </div>

            {/* Pages */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-pages">Pages</label>
              <input
                id="document-pages"
                name="pages"
                className={`ax-form-group__input ${errors.pages ? 'ax-form-group__input--error' : ''}`}
                type="number"
                min="1"
                value={formData.pages}
                onChange={handleChange}
              />
              {errorTextFor('pages') && <span className="ax-form-group__error">{errorTextFor('pages')}</span>}
            </div>

            {/* Visibilite */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-visibility">Visibilite</label>
              <select
                id="document-visibility"
                name="visibility"
                className={`ax-form-group__input ${errors.visibility ? 'ax-form-group__input--error' : ''}`}
                value={formData.visibility}
                onChange={handleChange}
              >
                {DOC_VISIBILITIES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errorTextFor('visibility') && (
                <span className="ax-form-group__error">{errorTextFor('visibility')}</span>
              )}
            </div>

            {/* Statut */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-status">Statut</label>
              <select
                id="document-status"
                name="status"
                className={`ax-form-group__input ${errors.status ? 'ax-form-group__input--error' : ''}`}
                value={formData.status || ''}
                onChange={handleChange}
              >
                {DOC_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errorTextFor('status') && <span className="ax-form-group__error">{errorTextFor('status')}</span>}
            </div>

            {/* Lien source Google Drive */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-drive">Lien source Google Drive</label>
              <input
                id="document-drive"
                name="driveUrl"
                className="ax-form-group__input"
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.driveUrl}
                onChange={handleChange}
              />
            </div>

            {/* Tags dynamiques */}
            {tags.length > 0 && (
              <fieldset className="ax-form-group">
                <legend className="ax-form-group__label">Tags</legend>
                {errors.tags ? <span className="ax-form-group__error">{errors.tags[0]}</span> : null}
                <div className="ax-doc-tags" role="group" aria-label="Selection des tags">
                  {tags.map((tag) => {
                    const checked = formData.tagIds.includes(tag.id)
                    return (
                      <label key={tag.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTag(tag.id)}
                          aria-label={`Tag ${tag.name}`}
                        />
                        <Badge variant={checked ? 'primary' : 'default'} size="sm">{tag.name}</Badge>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {/* Mise en avant */}
            <div className="ax-form-group">
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={Boolean(formData.isFeatured)}
                  onChange={handleChange}
                />
                Mettre a la une
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="ax-form-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate(ROUTE_PATHS.DOCUMENTS)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
              {isEditing ? 'Mettre a jour' : 'Creer le document'}
            </Button>
          </div>
        </form>
      )}
    </Container>
  )
}