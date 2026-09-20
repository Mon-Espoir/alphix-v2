/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Helpers documents partages
 * ---------------------------------------------------------------------------
 * Fonctions pures mutualisees par le module Documents. Aucune donnee n'est
 * fabriquee : toute valeur absente est rendue neutrement par l'appelant.
 */

import { ENV } from '../config/env'

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
 * Extrait l'URL du profil UB depuis la description d'un cours
 * (format posé par TeacherLinksSeeder : « Profil UB (Nom) : https://… »).
 * @param {object|null} course - Cours API.
 * @returns {string|null} URL absolue http(s) ou null.
 */
export function resolveTeacherProfileUrl(course) {
  const text = String(course?.description || '')
  const match = text.match(/https?:\/\/[^\s)"']+/i)
  if (!match) return null
  const url = match[0].replace(/[.,;]+$/, '')
  return /^https?:\/\//i.test(url) ? url : null
}

/**
 * Extrait l'URL consultable d'un document (aucune fabrication).
 * @param {object|null} doc - Document API.
 * @returns {string|null} URL ou null.
 */
export function resolveFileUrl(doc) {
  // Priorité 1 : API ALPHIX (/api/v1/documents/{id}/file) — sert le binaire local (public OU private) sans dépendre du symlink ni de Drive.
  // DocumentResource expose désormais api_file_url / api_preview_url.
  if (doc?.api_preview_url && typeof doc.api_preview_url === 'string' && doc.api_preview_url.trim()) {
    return doc.api_preview_url.trim()
  }
  if (doc?.api_file_url && typeof doc.api_file_url === 'string' && doc.api_file_url.trim()) {
    return doc.api_file_url.trim()
  }
  if (doc?.file_url && typeof doc.file_url === 'string' && doc.file_url.trim() && doc.file_url.includes('/api/v1/documents/')) {
    return doc.file_url.trim()
  }
  // Priorité 2 : Drive preview si drive_file_id réel
  let driveId = doc?.drive_file_id || null
  if (!driveId && doc?.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)) {
    driveId = doc.metadata.drive_file_id || null
  }
  if (!driveId && Array.isArray(doc?.metadata)) {
    const entry = doc.metadata.find((e) => typeof e === 'string' && e.startsWith('drive_file_id:'))
    if (entry) driveId = entry.replace('drive_file_id:', '')
  }
  if (!driveId && Array.isArray(doc?.metadata)) {
    const entry = doc.metadata.find((e) => typeof e === 'string' && e.startsWith('drive_file_id'))
    if (entry) driveId = entry.split(':')[1]
  }
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`

  // Priorité 3 : file_url / drive_web_view_link classiques (storage direct ou Drive /view)
  const pickUrl = (candidate) => {
    if (!candidate || typeof candidate !== 'string') return null
    const trimmed = candidate.trim()
    if (!trimmed) return null
    if (trimmed.includes('drive.google.com/file/d/') && trimmed.includes('/view')) {
      return trimmed.replace('/view', '/preview')
    }
    if (trimmed.startsWith('/storage/') || trimmed.startsWith('storage/')) {
      try {
        const base = (typeof window !== 'undefined' && window.location.origin) || ''
        const apiBase = (ENV.API_BASE_URL || '').replace(/\/api\/v1\/?$/, '') || base
        return trimmed.startsWith('/') ? `${apiBase}${trimmed}` : `${apiBase}/${trimmed}`
      } catch {
        return trimmed
      }
    }
    return trimmed
  }

  const raw = doc?.file_url || doc?.drive_web_view_link || null
  const resolved = pickUrl(raw)
  if (resolved) return resolved
  if (Array.isArray(doc?.metadata)) {
    const urlEntry = doc.metadata.find((e) => typeof e === 'string' && (e.startsWith('source_url:') || e.startsWith('http')))
    if (urlEntry) {
      const url = urlEntry.startsWith('source_url:') ? urlEntry.replace('source_url:', '') : urlEntry
      return pickUrl(url)
    }
  }
  if (doc?.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)) {
    const metaUrl = doc.metadata.file_url || doc.metadata.source_url || null
    if (metaUrl) return pickUrl(metaUrl)
  }
  return null
}

/**
 * URL de telechargement reel d'un document (Drive ou fichier direct).
 * @param {object|null} doc - Document API.
 * @returns {string|null} URL telechargeable, null si aucune.
 */
export function resolveDownloadUrl(doc) {
  // Priorité API ALPHIX (robuste au symlink, sert public OU private)
  if (doc?.api_file_url && typeof doc.api_file_url === 'string' && doc.api_file_url.trim()) {
    return `${doc.api_file_url.trim()}?download=1`
  }
  if (doc?.file_url && typeof doc.file_url === 'string' && doc.file_url.trim() && doc.file_url.includes('/api/v1/documents/')) {
    return `${doc.file_url.trim()}?download=1`
  }
  return (
    doc?.drive_download_link ||
    doc?.file_url ||
    doc?.metadata?.file_url ||
    (doc?.drive_file_id || doc?.metadata?.drive_file_id
      ? `https://drive.google.com/uc?export=download&id=${doc.drive_file_id || doc.metadata.drive_file_id}`
      : null)
  )
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
  // Semestre global réel (BAC3 S1 => Semestre 5), pas S1 brut
  if (semester) {
    // calcul global si BAC, sinon fallback nom brut
    const lvlCode = level?.code || ''
    const semCode = semester?.code || ''
    const m = String(lvlCode).match(/^BAC(\d+)$/)
    let semLabel = semester.name || ''
    if (m && (semCode === 'S1' || semCode === 'S2')) {
      const bac = Number(m[1])
      const g = (bac - 1) * 2 + (semCode === 'S1' ? 1 : 2)
      semLabel = `Semestre ${g}`
    }
    if (semLabel) trail.push({ label: semLabel })
  }
  if (course && (course.title || course.name)) {
    trail.push({
      label: `${course.code ? `${course.code} — ` : ''}${course.title || course.name}`,
      to: course.id ? `/documents?course_id=${course.id}` : undefined,
    })
  }
  trail.push({ label: documentTitle(doc) })
  return trail
}

/**
 * ---------------------------------------------------------------------------
 * Filtres de niveau document (type, visibilite, tag, dates, compteurs).
 * Contrairement aux filtres academiques (faculte/departement/niveau/semestre,
 * qui s'appliquent aux cours), ceux-ci s'appliquent aux documents eux-memes.
 */

/** Cles de filtres qui ciblent le document (et non le cours). */
export const DOC_LEVEL_FILTER_KEYS = Object.freeze([
  'docType',
  'visibility',
  'tagId',
  'fromDate',
  'toDate',
  'minDownloads',
  'minViews',
])

/**
 * Au moins un filtre de niveau document est-il actif ?
 * @param {object} [filters] - Valeurs de filtres (camelCase).
 * @returns {boolean}
 */
export function docLevelFiltersActive(filters = {}) {
  return DOC_LEVEL_FILTER_KEYS.some((key) => {
    const value = filters[key]
    return value !== '' && value !== undefined && value !== null
  })
}

/**
 * Mappe les filtres camelCase vers les parametres snake_case de l'API
 * (`GET /search` — SearchDocumentRequest cote Laravel).
 * @param {object} [filters] - Valeurs de filtres.
 * @param {object} [extra] - Parametres supplementaires (query, per_page...).
 * @returns {object} Parametres query string.
 */
export function buildDocSearchParams(filters = {}, extra = {}) {
  const params = { ...extra }
  if (filters.docType) params.doc_type = filters.docType
  if (filters.visibility) params.visibility = filters.visibility
  if (filters.tagId) params.tag_id = filters.tagId
  if (filters.fromDate) params.from_date = filters.fromDate
  if (filters.toDate) params.to_date = filters.toDate
  if (filters.minDownloads !== '' && filters.minDownloads != null) params.min_downloads = filters.minDownloads
  if (filters.minViews !== '' && filters.minViews != null) params.min_views = filters.minViews
  return params
}

/**
 * Applique les filtres de niveau document sur une liste (filtrage local,
 * tolerant aux champs manquants).
 * @param {Array<object>} docs - Documents (format API, camel ou snake).
 * @param {object} [filters] - Valeurs de filtres.
 * @returns {Array<object>} Documents filtrés.
 */
export function applyDocLevelFilters(docs, filters = {}) {
  return (docs || []).filter((doc) => {
    if (filters.docType && String(doc.doc_type ?? '') !== String(filters.docType)) return false
    if (filters.visibility && String(doc.visibility ?? '') !== String(filters.visibility)) return false
    if (filters.tagId) {
      const tags = Array.isArray(doc.tags) ? doc.tags : []
      const hit = tags.some((t) => String(t?.id ?? t) === String(filters.tagId))
      if (!hit) return false
    }
    const day = String(doc.created_at ?? '').slice(0, 10)
    if (filters.fromDate && (!day || day < filters.fromDate)) return false
    if (filters.toDate && (!day || day > filters.toDate)) return false
    if (filters.minDownloads !== '' && filters.minDownloads != null
      && Number(doc.downloads_count ?? 0) < Number(filters.minDownloads)) return false
    if (filters.minViews !== '' && filters.minViews != null
      && Number(doc.views_count ?? 0) < Number(filters.minViews)) return false
    return true
  })
}

/** Etat de filtres vierge (toutes les cles presentes, toutes vides). */
export function emptyFilters() {
  return {
    facultyId: '',
    departmentId: '',
    levelId: '',
    semesterId: '',
    docType: '',
    visibility: '',
    tagId: '',
    fromDate: '',
    toDate: '',
    minDownloads: '',
    minViews: '',
  }
}
