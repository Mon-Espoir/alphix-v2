/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Helpers documents partages
 * ---------------------------------------------------------------------------
 * Fonctions pures mutualisees par le module Documents. Aucune donnee n'est
 * fabriquee : toute valeur absente est rendue neutrement par l'appelant.
 */

/** Types de document supportes par la validation Laravel. */
export const DOC_TYPES = Object.freeze([
  { value: 'course', label: 'Cours' },
  { value: 'tp', label: 'TP' },
  { value: 'td', label: 'TD' },
  { value: 'exam', label: 'Examen' },
  { value: 'correction', label: 'Correction' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'summary', label: 'Resume' },
  { value: 'book', label: 'Livre' },
  { value: 'thesis', label: 'Memoire' },
  { value: 'report', label: 'Rapport' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'video', label: 'Video' },
  { value: 'external_link', label: 'Lien externe' },
  { value: 'other', label: 'Autre' },
])

/** Statuts de workflow supportes par la validation Laravel. */
export const DOC_STATUSES = Object.freeze([
  { value: 'pending', label: 'En attente', badge: 'default' },
  { value: 'processing', label: 'En traitement', badge: 'default' },
  { value: 'approved', label: 'Approuve', badge: 'primary' },
  { value: 'rejected', label: 'Rejete', badge: 'danger' },
  { value: 'archived', label: 'Archive', badge: 'warning' },
])

/** Visibilites supportees par la validation Laravel. */
export const DOC_VISIBILITIES = Object.freeze([
  { value: 'public', label: 'Public' },
  { value: 'faculty', label: 'Faculte' },
  { value: 'department', label: 'Departement' },
  { value: 'private', label: 'Prive' },
])

/** Critere de tri -> cle du document. */
const SORT_KEYS = Object.freeze({
  newest: 'created_at',
  oldest: 'created_at',
  alpha: 'title',
  downloads: 'downloads_count',
  views: 'views_count',
})

/**
 * Libelle lisible d'un type de document.
 * @param {string} value - Valeur brute API.
 * @returns {string} Libelle ou valeur brute si inconnue.
 */
export function docTypeLabel(value) {
  const found = DOC_TYPES.find((t) => t.value === value)
  return found ? found.label : String(value ?? '-')
}

/**
 * Metadonnees de badge d'un statut.
 * @param {string} value - Statut brut API.
 * @returns {{label: string, badge: string}} Libelle + variante Badge.
 */
export function docStatusMeta(value) {
  const found = DOC_STATUSES.find((s) => s.value === value)
  return found || { label: String(value ?? '-'), badge: 'default' }
}

/**
 * Libelle d'une visibilite.
 * @param {string} value - Valeur brute API.
 * @returns {string} Libelle ou tiret.
 */
export function docVisibilityLabel(value) {
  const found = DOC_VISIBILITIES.find((v) => v.value === value)
  return found ? found.label : String(value ?? '-')
}

/**
 * Formate une taille en octets en chaine lisible.
 * @param {number|string|null} bytes - Taille brute.
 * @returns {string} Taille formatee ou '-' si absente.
 */
export function formatFileSize(bytes) {
  if (bytes == null || bytes === '') return '-'
  const size = Number(bytes)
  if (!Number.isFinite(size) || size < 0) return '-'
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} Mo`
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

/**
 * Formate une date ISO en format court FR.
 * @param {string|null} value - Date ISO.
 * @returns {string} Date formatee ou '-'.
 */
export function formatShortDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Construit les parametres de requete pour SearchApi (contrat Laravel valide).
 * Les cles vides sont omises afin de ne jamais envoyer de parametre invalide.
 *
 * @param {object} filters - Filtres bruts de l'interface.
 * @returns {object} Parametres valides pour SearchApi.search().
 */
export function buildSearchParams(filters) {
  const params = {}
  if (filters.query && filters.query.trim()) params.query = filters.query.trim()
  if (filters.facultyId) params.faculty_id = filters.facultyId
  if (filters.departmentId) params.department_id = filters.departmentId
  if (filters.docType) params.doc_type = filters.docType
  if (filters.academicYear) params.academic_year = filters.academicYear
  if (filters.language) params.language = filters.language
  if (filters.visibility) params.visibility = filters.visibility
  if (filters.sort) params.sort = filters.sort
  if (filters.order) params.order = filters.order
  params.per_page = 100
  return params
}

/**
 * Applique les facettes non supportees par l'API (client-side, donnees reelles).
 * @param {Array<object>} documents - Documents a filtrer.
 * @param {object} f - Facettes : levelId, semesterId, courseId, tagId, fromDate,
 *   toDate, minDownloads, minViews.
 * @returns {Array<object>} Documents correspondant a TOUTES les facettes.
 */
export function applyClientFilters(documents, f) {
  return documents.filter((doc) => {
    if (f.levelId && doc.course?.level?.id !== Number(f.levelId)) return false
    if (f.semesterId && doc.course?.semester?.id !== Number(f.semesterId)) return false
    if (f.courseId && doc.course?.id !== Number(f.courseId)) return false
    if (f.tagId) {
      const tags = Array.isArray(doc.tags) ? doc.tags : []
      if (!tags.some((tag) => tag.id === Number(f.tagId))) return false
    }
    if (f.fromDate && !(doc.created_at && doc.created_at >= f.fromDate)) return false
    if (f.toDate && !(doc.created_at && doc.created_at <= `${f.toDate}T23:59:59`)) return false
    if (f.minDownloads != null && f.minDownloads !== '' &&
      (doc.downloads_count ?? 0) < Number(f.minDownloads)) return false
    if (f.minViews != null && f.minViews !== '' &&
      (doc.views_count ?? 0) < Number(f.minViews)) return false
    return true
  })
}

/**
 * Trie une liste de documents selon un critere et un ordre.
 * @param {Array<object>} documents - Liste source (non mutee).
 * @param {string} sortBy - Cle ('newest','oldest','alpha','downloads','views').
 * @param {'asc'|'desc'} [order] - Ordre explicite (defaut derive du critere).
 * @returns {Array<object>} Nouvelle liste triee.
 */
export function sortDocuments(documents, sortBy, order) {
  const key = SORT_KEYS[sortBy]
  if (!key) return [...documents]
  const direction = order || (sortBy === 'oldest' || sortBy === 'alpha' ? 'asc' : 'desc')
  const sorted = [...documents].sort((a, b) => {
    const va = a?.[key] ?? ''
    const vb = b?.[key] ?? ''
    if (typeof va === 'string' || typeof vb === 'string') {
      return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' })
    }
    return Number(va) - Number(vb)
  })
  return direction === 'desc' ? sorted.reverse() : sorted
}

/**
 * Titre affichable d'un document.
 * @param {object|null} doc - Document API.
 * @returns {string} Titre ou '-'.
 */
export function documentTitle(doc) {
  return doc?.title || doc?.name || '-'
}

/**
 * Extrait l'URL consultable d'un document (aucune fabrication).
 * @param {object|null} doc - Document API.
 * @returns {string|null} URL ou null.
 */
export function resolveFileUrl(doc) {
  return doc?.file_url || doc?.metadata?.file_url || null
}

/**
 * Construit le fil d'Ariane academique complet depuis un document charge.
 * @param {object|null} doc - Document avec relations imbriquees si disponibles.
 * @returns {Array<{label: string, to?: string}>} Segments ordonnes du fil.
 */
export function buildAcademicTrail(doc) {
  const trail = [{ label: 'Documents', to: '/documents' }]
  const faculty = doc?.course?.department?.faculty
  const department = doc?.course?.department
  const level = doc?.course?.level
  const semester = doc?.course?.semester
  const course = doc?.course
  if (faculty?.name) trail.push({ label: faculty.name })
  if (department?.name) trail.push({ label: department.name })
  if (level?.name) trail.push({ label: level.name })
  if (semester?.name) trail.push({ label: semester.name })
  if (course && (course.title || course.name)) {
    trail.push({
      label: course.title || course.name,
      to: course.id ? `/courses/${course.id}/edit` : undefined,
    })
  }
  trail.push({ label: documentTitle(doc) })
  return trail
}