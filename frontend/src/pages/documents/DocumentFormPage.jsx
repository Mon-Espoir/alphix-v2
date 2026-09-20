/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Document Form Page
 * ---------------------------------------------------------------------------
 * Creation / edition de document : parsing strict des erreurs Laravel 422,
 * selecteur dynamique de tags, visibilite, statut, integration du lien
 * source Google Drive. Empreinte SHA-256 calculee localement via Web Crypto.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DocumentApi } from '../../api/DocumentApi'
import { DocumentTagApi } from '../../api/DocumentTagApi'
import { CourseApi } from '../../api/CourseApi'
import { UploadApi } from '../../api/UploadApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import { useNotification } from '../../hooks/useNotification'
import { normalizeApiList, slugify } from '../../utils/academic'
import { cachedAcademicList } from '../../utils/academicCache'
import { validateUploadFile } from '../../utils/upload'
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const notify = useNotification()
  const isEditing = Boolean(id)
  const preselectedCourseId = searchParams.get('course_id') || ''

  const [courses, setCourses] = useState([])
  const [tags, setTags] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    originalName: '',
    description: '',
    docType: 'course',
    courseId: preselectedCourseId,
    academicYear: '',
    language: 'fr',
    pages: '',
    visibility: 'public',
    status: 'pending',
    isFeatured: false,
    tagIds: [],
    driveUrl: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [isSubmitting, setIsSubmitting] = useState(false)

  // References (echecs silencieux non bloquants). Index cours unique + cache.
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const courseList = await cachedAcademicList('courses', () => CourseApi.list()).catch(() => [])
        if (!cancelled) setCourses(normalizeApiList(courseList))
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
  // NOTE: deps volontaires [id] uniquement — notify/navigate stables via ref
  // pour eviter la boucle refetch -> setIsLoading -> remontage -> clignotement.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function run() {
      setIsLoading(true)
      try {
        const raw = await DocumentApi.get(id)
        const data = raw?.data ?? raw
        let loadedTags = []
        try {
          loadedTags = normalizeApiList(await DocumentTagApi.getByDocument(id))
        } catch {
          loadedTags = []
        }
        if (cancelled) return
        const metadataList = Array.isArray(data?.metadata) ? data.metadata : []
        const sourceEntry = metadataList.find((entry) => String(entry).startsWith('source_url:')) || ''
        const loadedTagIds = normalizeApiList(loadedTags).map((tag) => tag.id).filter((v) => v != null)
        // Fallback tags inclus dans show (relation chargee) si endpoint dedie vide.
        const embeddedTagIds = Array.isArray(data?.tags) ? data.tags.map((tag) => tag.id).filter((v) => v != null) : []
        setFormData({
          title: documentTitle(data) === '-' ? '' : (data?.title || ''),
          originalName: data?.original_name || '',
          description: data?.description || '',
          docType: data?.doc_type || 'other',
          courseId: data?.course?.id ?? data?.course_id ?? '',
          academicYear: data?.academic_year || '',
          language: data?.language || '',
          pages: data?.pages ?? '',
          visibility: data?.visibility || 'public',
          status: data?.status || 'pending',
          isFeatured: Boolean(data?.is_featured),
          tagIds: loadedTagIds.length > 0 ? loadedTagIds : embeddedTagIds,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  /**
   * Selection de fichier : derive nom original, MIME, taille et SHA-256.
   * @param {object} event - Evenement input file.
   */
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
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
      setSelectedFile(null)
      setFileInfo(null)
      notify.error('Impossible de lire le fichier pour calculer son empreinte.')
      return
    }

    // Reconnaissance intelligente (base réelle : facultés/départements/cours)
    try {
      const { data: rec } = await UploadApi.recognize(file.name)
      if (!rec) return
      setFormData((prev) => ({
        ...prev,
        docType: prev.docType === 'course' && rec.doc_type ? rec.doc_type : prev.docType,
        academicYear: rec.academic_year || prev.academicYear,
        courseId: rec.course_id ? String(rec.course_id) : prev.courseId,
      }))

      if (rec.course) {
        notify.success(`Cours détecté automatiquement : ${rec.course.code} — ${rec.course.name}`)
      } else if ((rec.suggestions?.length ?? 0) > 0) {
        notify.info(
          `${rec.suggestions.length} cours possible(s) détecté(s) — sélectionnez manuellement dans la liste.`,
        )
      }
    } catch {
      // Reconnaissance indisponible : saisie manuelle inchangée.
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
    if (!isEditing && !selectedFile) {
      setErrors({ file: ['Veuillez sélectionner un fichier.'] })
      setIsSubmitting(false)
      return
    }
    // Garde-fou local (MIME + 50 Mo) : evite un envoi inutile vers le serveur.
    if (!isEditing && selectedFile) {
      const verdict = validateUploadFile(selectedFile)
      if (!verdict.valid) {
        setErrors({ file: verdict.errors })
        setIsSubmitting(false)
        return
      }
    }
    if (!isEditing && !fileInfo?.hash) {
      setErrors({ file_hash: ['Veuillez patienter : empreinte du fichier en cours de calcul.'] })
      setIsSubmitting(false)
      return
    }

    // Construction FormData avec file binaire (correction rupture transmission)
    const fd = new FormData()
    if (formData.courseId) fd.append('course_id', String(Number(formData.courseId)))
    fd.append('title', formData.title.trim())
    fd.append('original_name', fileInfo?.name || formData.originalName.trim())
    fd.append('slug', slugify(formData.title.trim()) || `document-${Date.now()}`)
    if (formData.description.trim()) fd.append('description', formData.description.trim())
    fd.append('doc_type', formData.docType)
    if (formData.academicYear.trim()) fd.append('academic_year', formData.academicYear.trim())
    if (formData.language.trim()) fd.append('language', formData.language.trim())
    if (formData.pages !== '') fd.append('pages', String(Number(formData.pages)))
    if (fileInfo) {
      fd.append('file_size', String(fileInfo.fileSize))
      fd.append('file_hash', fileInfo.hash)
      fd.append('mime_type', fileInfo.mimeType)
    }
    fd.append('visibility', formData.visibility)
    if (formData.status) fd.append('status', formData.status)
    fd.append('is_featured', formData.isFeatured ? '1' : '0')
    if (formData.tagIds.length > 0) formData.tagIds.forEach((tid) => fd.append('tags[]', String(Number(tid))))
    if (formData.driveUrl.trim()) fd.append('metadata[]', `source_url:${formData.driveUrl.trim()}`)
    // Le fichier binaire est indispensable pour POST /api/v1/documents
    if (selectedFile) fd.append('file', selectedFile, selectedFile.name)
    // Fallback fileInfo pour compatibilité si selectedFile perdu
    if (!selectedFile && fileInfo?.name) fd.append('file', new Blob([]), fileInfo.name)

    try {
      if (isEditing) {
        // En édition, le hash est immuable, on envoie JSON (pas de nouveau fichier)
        const jsonPayload = {
          course_id: formData.courseId ? Number(formData.courseId) : undefined,
          title: formData.title.trim(),
          original_name: formData.originalName.trim(),
          slug: slugify(formData.title.trim()) || `document-${Date.now()}`,
          description: formData.description.trim() || undefined,
          doc_type: formData.docType,
          academic_year: formData.academicYear.trim() || undefined,
          language: formData.language.trim() || undefined,
          pages: formData.pages === '' ? undefined : Number(formData.pages),
          visibility: formData.visibility,
          status: formData.status || undefined,
          is_featured: Boolean(formData.isFeatured),
          tags: formData.tagIds.length > 0 ? formData.tagIds.map(Number) : undefined,
          metadata: formData.driveUrl.trim() ? [`source_url:${formData.driveUrl.trim()}`] : undefined,
        }
        await DocumentApi.update(id, jsonPayload)
        notify.success('Document mis a jour avec succes.')
      } else {
        await DocumentApi.create(fd)
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
                  className={`ax-form-group__input ${errors.file || errors.file_hash ? 'ax-form-group__input--error' : ''}`}
                  type="file"
                  onChange={handleFileChange}
                  required
                />
                {fileInfo ? (
                  <Badge variant="primary" size="sm">Empreinte SHA-256 calculee • {(fileInfo.fileSize / 1024).toFixed(1)} Ko</Badge>
                ) : (
                  <span className="ax-text--muted ax-text--xs">Sélectionnez un PDF, DOCX, PPTX, JPG ou PNG (max 20 Mo).</span>
                )}
                {errorTextFor('file') && <span className="ax-form-group__error">{errorTextFor('file')}</span>}
                {errorTextFor('file_hash') && <span className="ax-form-group__error">{errorTextFor('file_hash')}</span>}
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
                autoFocus={!isEditing}
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

            {/* Cours rattache — pré-sélectionné via ?course_id= depuis la recherche */}
            <div className="ax-form-group">
              <label className="ax-form-group__label" htmlFor="document-course">Cours {preselectedCourseId ? <Badge variant="primary" size="sm">Pré-sélectionné</Badge> : null}</label>
              <select
                id="document-course"
                name="courseId"
                className={`ax-form-group__input ${errors.course_id ? 'ax-form-group__input--error' : ''}`}
                value={formData.courseId}
                onChange={handleChange}
              >
                <option value="">Aucun cours</option>
                {preselectedCourseId && !courses.some((c) => String(c.id) === String(preselectedCourseId)) && (
                  <option value={preselectedCourseId}>Cours #{preselectedCourseId} (sélection depuis la recherche)</option>
                )}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.code ? `${course.code} — ` : ''}{course.title || course.name}</option>
                ))}
              </select>
              {preselectedCourseId && <span className="ax-text--muted ax-text--xs">Cours pré-sélectionné depuis votre recherche. Vous pouvez le modifier.</span>}
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