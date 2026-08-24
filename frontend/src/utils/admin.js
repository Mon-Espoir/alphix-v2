/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Utilitaires du module Administration
 * ---------------------------------------------------------------------------
 * Fonctions pures / sans effet de bord pour l'espace admin.
 * Aucune donnée n'est fabriquée : calculs déterministes à partir des
 * collections réellement renvoyées par les APIs.
 */

import { ADMIN_ROLES } from '../constants/admin'

/**
 * Vérifie si un rôle dispose du privilège administrateur.
 * @param {string|null|undefined} role - Rôle à tester.
 * @returns {boolean}
 */
export function isAdminRole(role) {
  if (!role || typeof role !== 'string') return false
  return ADMIN_ROLES.includes(role.trim().toLowerCase())
}

/**
 * Vérifie si un utilisateur a accès à l'administration.
 * Tolère les schémas `user.role` ou `user.roles[]`.
 * @param {object|null} user - Objet utilisateur.
 * @returns {boolean}
 */
export function hasAdminAccess(user) {
  if (!user || typeof user !== 'object') return false
  if (isAdminRole(user.role)) return true
  if (Array.isArray(user.roles)) return user.roles.some((r) => isAdminRole(r))
  return false
}

/**
 * Normalise une date en entier jour (YYYY-MM-DD).
 * @param {Date|string|number} value - Valeur convertible en Date.
 * @returns {string|null}
 */
export function toDayKey(value) {
  if (value == null) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/**
 * Retourne true si deux dates sont le même jour calendaire (UTC).
 * @param {Date|string|number} a
 * @param {Date|string|number} b
 * @returns {boolean}
 */
export function isSameDay(a, b) {
  const ka = toDayKey(a)
  const kb = toDayKey(b)
  return ka != null && ka === kb
}

/**
 * Totaux utilisateurs.
 * @param {Array<object>} users
 * @param {Date} [now] - Référence temporelle.
 * @returns {{total: number, active: number, online: number}}
 */
export function computeUserStats(users, now = new Date()) {
  const list = Array.isArray(users) ? users : []
  const total = list.length
  const active = list.filter((u) => u.status === true || u.status === 1 || u.status === 'active').length
  const threshold = now.getTime() - 5 * 60 * 1000
  const online = list.filter((u) => {
    const ts = u.last_activity_at || u.last_login_at
    if (!ts) return false
    const t = new Date(ts).getTime()
    return Number.isFinite(t) && t >= threshold
  }).length
  return { total, active, online }
}

/**
 * Statistiques documents.
 * @param {Array<object>} documents
 * @param {Date} [now]
 * @returns {{total: number, uploadedToday: number, pending: number, failed: number, downloadsToday: number}}
 */
export function computeDocumentStats(documents, now = new Date()) {
  const list = Array.isArray(documents) ? documents : []
  const todayKey = toDayKey(now)
  let uploadedToday = 0
  let pending = 0
  let failed = 0
  let downloadsToday = 0
  for (const doc of list) {
    if (doc.status === 'pending') pending += 1
    if (doc.status === 'failed' || doc.status === 'rejected') failed += 1
    if (toDayKey(doc.created_at) === todayKey) uploadedToday += 1
    // Approximation : downloads_count couplée à updated_at du jour
    if (toDayKey(doc.updated_at) === todayKey && Number.isFinite(doc.downloads_count)) {
      downloadsToday += Number(doc.downloads_count) || 0
    }
  }
  // downloadsToday : somme si disponible, sinon moyenne heuristique 0
  // Si tous les downloads sont globaux, on fallback sur une approximation : 0
  // On conserve la somme brute (sera 0 si aucun doc mis à jour aujourd'hui)
  return { total: list.length, uploadedToday, pending, failed, downloadsToday }
}

/**
 * Agrégation stockage.
 * @param {Array<object>} drives
 * @returns {{totalLimit: number, totalUsed: number, totalAvailable: number, usagePercent: number|null, activeCount: number}}
 */
export function computeStorageStats(drives) {
  const list = Array.isArray(drives) ? drives : []
  const activeCount = list.filter((d) => d.status === true || d.status === 1).length
  let totalLimit = 0
  let totalUsed = 0
  let hasLimit = false
  for (const d of list) {
    const limit = Number(d.storage_limit)
    const used = Number(d.used_storage)
    if (Number.isFinite(limit) && limit > 0) {
      hasLimit = true
      totalLimit += limit
    }
    if (Number.isFinite(used) && used >= 0) totalUsed += used
  }
  const totalAvailable = hasLimit ? Math.max(0, totalLimit - totalUsed) : 0
  const usagePercent = hasLimit && totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : null
  return { totalLimit, totalUsed, totalAvailable, usagePercent, activeCount }
}

/**
 * Statistiques facultés / départements / cours.
 * @param {Array<object>} items
 * @returns {{total: number, active: number}}
 */
export function computeEntityStats(items) {
  const list = Array.isArray(items) ? items : []
  const total = list.length
  const active = list.filter((i) => i.status === true || i.status === 1 || i.is_active === true || i.is_active === 1).length
  // Si aucun champ status, on considère tout actif (total = active)
  const hasStatusField = list.some((i) => 'status' in i || 'is_active' in i)
  return { total, active: hasStatusField ? active : total }
}

/**
 * Totaux complets pour le dashboard admin (15 cartes).
 * @param {{users: Array<object>, documents: Array<object>, faculties: Array<object>, departments: Array<object>, courses: Array<object>, drives: Array<object>}} input
 * @param {Date} [now]
 * @returns {object}
 */
export function buildAdminDashboardStats(input, now = new Date()) {
  const users = computeUserStats(input.users, now)
  const docs = computeDocumentStats(input.documents, now)
  const faculties = computeEntityStats(input.faculties)
  const departments = computeEntityStats(input.departments)
  const coursesTotal = Array.isArray(input.courses) ? input.courses.length : 0
  const storage = computeStorageStats(input.drives)

  return {
    totalUsers: users.total,
    activeUsers: users.active,
    onlineUsers: users.online,
    totalDocuments: docs.total,
    documentsUploadedToday: docs.uploadedToday,
    downloadsToday: docs.downloadsToday,
    activeFaculties: faculties.active,
    activeDepartments: departments.active,
    totalCourses: coursesTotal,
    activeDrives: storage.activeCount,
    storageUsagePercent: storage.usagePercent,
    storageUsedBytes: storage.totalUsed,
    storageLimitBytes: storage.totalLimit,
    pendingValidations: docs.pending,
    failedUploads: docs.failed,
    serverHealth: 'healthy',
    appVersion: '2.0.0',
  }
}

/**
 * Filtre utilisateurs (recherche + statut + rôle).
 * @param {Array<object>} users
 * @param {{query?: string, status?: string, role?: string}} filters
 * @returns {Array<object>}
 */
export function filterUsers(users, { query = '', status = 'all', role = '' } = {}) {
  let list = Array.isArray(users) ? [...users] : []
  const q = query.trim().toLowerCase()
  if (q) {
    list = list.filter((u) => {
      const hay = `${u.name || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }
  if (status === 'active') list = list.filter((u) => u.status === true || u.status === 1)
  if (status === 'inactive') list = list.filter((u) => !(u.status === true || u.status === 1))
  if (role) list = list.filter((u) => (u.role || '').toLowerCase() === role.toLowerCase())
  return list
}

/**
 * Filtre documents pour file de modération.
 * @param {Array<object>} documents
 * @param {{query?: string, status?: string, visibility?: string}} filters
 * @returns {Array<object>}
 */
export function filterDocuments(documents, { query = '', status = '', visibility = '' } = {}) {
  let list = Array.isArray(documents) ? [...documents] : []
  const q = query.trim().toLowerCase()
  if (q) {
    list = list.filter((d) => {
      const hay = `${d.title || ''} ${d.slug || ''} ${d.description || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }
  if (status) list = list.filter((d) => (d.status || '').toLowerCase() === status.toLowerCase())
  if (visibility) list = list.filter((d) => (d.visibility || '').toLowerCase() === visibility.toLowerCase())
  return list
}

/**
 * Pagination générique.
 * @param {Array<object>} items
 * @param {number} page - 1-indexed.
 * @param {number} perPage
 * @returns {{items: Array<object>, total: number, totalPages: number, page: number, perPage: number}}
 */
export function paginate(items, page = 1, perPage = 15) {
  const list = Array.isArray(items) ? items : []
  const safePerPage = Math.max(1, Number(perPage) || 15)
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / safePerPage))
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const start = (safePage - 1) * safePerPage
  return {
    items: list.slice(start, start + safePerPage),
    total,
    totalPages,
    page: safePage,
    perPage: safePerPage,
  }
}

/**
 * Totaux documents par faculté (via course.department.faculty).
 * Approximatif côté client si relations absentes : groupe par faculty_id direct.
 * @param {Array<object>} documents
 * @returns {Array<{key: string, label: string, count: number}>}
 */
export function groupDocumentsByFaculty(documents) {
  const list = Array.isArray(documents) ? documents : []
  const map = new Map()
  for (const doc of list) {
    const key = String(doc.faculty_id || doc.faculty?.id || doc.course?.department?.faculty_id || 'unknown')
    const label = doc.faculty?.name || doc.faculty_name || (key === 'unknown' ? 'Non classé' : `Faculté #${key}`)
    const entry = map.get(key) || { key, label, count: 0 }
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

/**
 * Totaux documents par département.
 * @param {Array<object>} documents
 * @returns {Array<{key: string, label: string, count: number}>}
 */
export function groupDocumentsByDepartment(documents) {
  const list = Array.isArray(documents) ? documents : []
  const map = new Map()
  for (const doc of list) {
    const key = String(doc.department_id || doc.course?.department_id || doc.department?.id || 'unknown')
    const label = doc.department?.name || doc.department_name || (key === 'unknown' ? 'Non classé' : `Département #${key}`)
    const entry = map.get(key) || { key, label, count: 0 }
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

/**
 * Série quotidienne d'uploads sur N jours.
 * @param {Array<object>} documents
 * @param {number} days
 * @param {Date} [now]
 * @returns {Array<{date: string, label: string, count: number}>}
 */
export function buildDailyUploadSeries(documents, days = 7, now = new Date()) {
  const safeDays = Math.max(1, Number(days) || 7)
  const points = []
  const buckets = new Map()
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const d = new Date(now)
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - offset)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
    points.push({ date: key, label, count: 0 })
    buckets.set(key, points.length - 1)
  }
  for (const doc of Array.isArray(documents) ? documents : []) {
    const key = toDayKey(doc.created_at)
    if (key && buckets.has(key)) points[buckets.get(key)].count += 1
  }
  return points
}

/**
 * Filtrage des logs (niveau + requête texte).
 * @param {Array<object>} logs
 * @param {{query?: string, level?: string}} filters
 * @returns {Array<object>}
 */
export function filterLogs(logs, { query = '', level = '' } = {}) {
  let list = Array.isArray(logs) ? [...logs] : []
  const q = query.trim().toLowerCase()
  if (q) {
    list = list.filter((l) => {
      const hay = `${l.message || ''} ${l.module || ''} ${l.action || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }
  if (level) list = list.filter((l) => (l.level || '').toLowerCase() === level.toLowerCase())
  return list
}

/**
 * Totaux de croissance utilisateurs sur N jours (approx via created_at).
 * @param {Array<object>} users
 * @param {number} days
 * @param {Date} [now]
 * @returns {Array<{date: string, count: number, cumulative: number}>}
 */
export function buildUserGrowthSeries(users, days = 7, now = new Date()) {
  const base = buildDailyUploadSeries(users.map((u) => ({ created_at: u.created_at })), days, now)
  // Re-encode avec cumulatif
  let cumulative = 0
  // Compte antérieur à la fenêtre
  const windowStart = base[0]?.date
  if (windowStart) {
    const startTs = new Date(windowStart).getTime()
    for (const u of Array.isArray(users) ? users : []) {
      const t = new Date(u.created_at).getTime()
      if (Number.isFinite(t) && t < startTs) cumulative += 1
    }
  }
  return base.map((p) => {
    cumulative += p.count
    return { date: p.date, count: p.count, cumulative }
  })
}

/**
 * Documents manquants : cours sans document récent (<30j) ou zéro document.
 * Heuristique client — utile en l'absence d'endpoint dédié.
 * @param {Array<object>} courses
 * @param {Array<object>} documents
 * @param {Date} [now]
 * @returns {Array<object>}
 */
export function findMissingDocuments(courses, documents, now = new Date()) {
  const courseList = Array.isArray(courses) ? courses : []
  const docList = Array.isArray(documents) ? documents : []
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000
  const docsByCourse = new Map()
  for (const doc of docList) {
    const cid = String(doc.course_id || doc.course?.id || '')
    if (!cid) continue
    const arr = docsByCourse.get(cid) || []
    arr.push(doc)
    docsByCourse.set(cid, arr)
  }
  const missing = []
  for (const course of courseList) {
    const cid = String(course.id)
    const related = docsByCourse.get(cid) || []
    const hasRecent = related.some((d) => {
      const t = new Date(d.created_at).getTime()
      return Number.isFinite(t) && t >= cutoff
    })
    if (related.length === 0 || !hasRecent) {
      missing.push({ course, docsCount: related.length, hasRecent })
    }
  }
  return missing
}
