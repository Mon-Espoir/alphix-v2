/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Automation pure helpers
 * ---------------------------------------------------------------------------
 * Deterministic, side-effect free helpers for document processing,
 * storage monitoring and statistics. All functions are unit-tested.
 */

import { AUTOMATION_CONFIDENCE_THRESHOLD, AUTOMATION_DOC_TYPES } from '../constants/automation'
import { UPLOAD_CONSTRAINTS } from '../constants/upload'

/**
 * Extract metadata from filename using token heuristics.
 * Supports patterns: CODE_type_year, CODE-year-type, type_CODE.
 * @param {string} filename
 * @returns {{raw: string, tokens: string[], courseCode: string|null, year: number|null, docType: string|null, semester: string|null}}
 */
export function extractMetadataFromFilename(filename) {
  const raw = String(filename || '').trim()
  const base = raw.replace(/\.[^.]+$/, '').toLowerCase()
  const tokens = base.split(/[^a-z0-9]+/).filter(Boolean)
  let courseCode = null
  let year = null
  let docType = null
  let semester = null

  const codeRe = /^[a-z]{2,5}\d{2,4}$/i
  for (const t of tokens) {
    if (!courseCode && codeRe.test(t)) courseCode = t.toUpperCase()
  }
  const yearRe = /^(19|20)\d{2}$/
  for (const t of tokens) {
    if (!year && yearRe.test(t)) year = Number(t)
  }
  for (const t of tokens) {
    if (!docType && AUTOMATION_DOC_TYPES.includes(t)) docType = t
  }
  // crude semester hint s1..s8 or sem1
  const sem = tokens.find((t) => /^s[1-8]$/.test(t) || /^sem[1-8]$/.test(t))
  if (sem) semester = sem.replace('sem', 's')

  return { raw, tokens, courseCode, year, docType, semester }
}

/**
 * Suggest faculty by code/name token match.
 * @param {Array<object>} faculties
 * @param {{tokens: string[], courseCode: string|null}} meta
 * @returns {{faculty: object|null, confidence: number}}
 */
export function suggestFaculty(faculties, meta) {
  const list = Array.isArray(faculties) ? faculties : []
  if (list.length === 0) return { faculty: null, confidence: 0 }
  const tok = Array.isArray(meta.tokens) ? meta.tokens : []
  let best = null
  let bestScore = 0
  for (const f of list) {
    const hay = `${f.code || ''} ${f.name || ''}`.toLowerCase()
    const sc = tok.some((t) => hay.includes(t)) ? 0.7 : 0
    const exact = meta.courseCode && hay.includes(meta.courseCode.slice(0, 3).toLowerCase()) ? 0.3 : 0
    const total = sc + exact
    if (total > bestScore) { bestScore = total; best = f }
  }
  return { faculty: best, confidence: Math.min(1, bestScore) }
}

export function suggestDepartment(departments, meta, facultyId) {
  const list = Array.isArray(departments) ? departments : []
  const filtered = facultyId ? list.filter((d) => String(d.faculty_id) === String(facultyId)) : list
  const pool = filtered.length ? filtered : list
  if (pool.length === 0) return { department: null, confidence: 0 }
  const tok = meta.tokens || []
  let best = null
  let bestScore = 0
  for (const d of pool) {
    const hay = `${d.code || ''} ${d.name || ''}`.toLowerCase()
    const sc = tok.some((t) => hay.includes(t)) ? 0.75 : 0
    if (sc > bestScore) { bestScore = sc; best = d }
  }
  // fallback: first of faculty
  if (!best && pool.length) best = pool[0]
  return { department: best, confidence: best ? Math.max(0.35, bestScore) : 0 }
}

export function suggestCourse(courses, meta, departmentId) {
  const list = Array.isArray(courses) ? courses : []
  const pool = departmentId ? list.filter((c) => String(c.department_id) === String(departmentId)) : list
  const search = pool.length ? pool : list
  if (search.length === 0) return { course: null, confidence: 0 }
  if (meta.courseCode) {
    const exact = search.find((c) => String(c.code || '').toUpperCase() === meta.courseCode)
    if (exact) return { course: exact, confidence: 0.95 }
  }
  // fuzzy by token
  let best = null
  let bestScore = 0
  for (const c of search) {
    const hay = `${c.code || ''} ${c.name || ''}`.toLowerCase()
    const sc = (meta.tokens || []).some((t) => hay.includes(t)) ? 0.6 : 0
    if (sc > bestScore) { bestScore = sc; best = c }
  }
  return { course: best, confidence: best ? Math.max(0.3, bestScore) : 0 }
}

export function suggestSemester(semesters, meta) {
  const list = Array.isArray(semesters) ? semesters : []
  if (list.length === 0) return { semester: null, confidence: 0 }
  if (!meta.semester) return { semester: null, confidence: 0 }
  const key = meta.semester
  const found = list.find((s) => String(s.code || s.name || '').toLowerCase().includes(key))
  return { semester: found || null, confidence: found ? 0.85 : 0 }
}

export function suggestDocType(meta) {
  if (meta.docType) return { docType: meta.docType, confidence: 0.9 }
  return { docType: 'other', confidence: 0.3 }
}

/**
 * Build suggestion bundle and overall confidence.
 * @param {object} ctx - {faculties, departments, courses, semesters}
 * @param {object} meta - from extractMetadataFromFilename
 * @returns {{suggestions: object, confidence: number, needsConfirmation: boolean}}
 */
export function buildSuggestions(ctx, meta) {
  const fac = suggestFaculty(ctx.faculties || [], meta)
  const dep = suggestDepartment(ctx.departments || [], meta, fac.faculty?.id)
  const cou = suggestCourse(ctx.courses || [], meta, dep.department?.id)
  const sem = suggestSemester(ctx.semesters || [], meta)
  const typ = suggestDocType(meta)

  const weights = { faculty: 0.2, department: 0.2, course: 0.3, semester: 0.15, docType: 0.15 }
  const overall = fac.confidence * weights.faculty + dep.confidence * weights.department + cou.confidence * weights.course + sem.confidence * weights.semester + typ.confidence * weights.docType
  const confidence = Math.round(overall * 100) / 100
  return {
    suggestions: {
      faculty: fac.faculty,
      department: dep.department,
      course: cou.course,
      semester: sem.semester,
      docType: typ.docType,
      scores: { faculty: fac.confidence, department: dep.confidence, course: cou.confidence, semester: sem.confidence, docType: typ.confidence },
    },
    confidence,
    needsConfirmation: confidence < AUTOMATION_CONFIDENCE_THRESHOLD,
  }
}

/**
 * Validate file constraints (mirrors upload utils but pure).
 * @param {{name?:string,size?:number,type?:string}} file
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateConstraints(file) {
  const errors = []
  if (!file || typeof file !== 'object') return { valid: false, errors: ['Fichier manquant.'] }
  const size = Number(file.size)
  if (!Number.isFinite(size) || size <= 0) errors.push('Fichier vide.')
  else if (size > UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES) errors.push('Fichier trop volumineux.')
  const mime = String(file.type || '')
  if (!UPLOAD_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(mime)) errors.push('Type MIME non autorisé.')
  return { valid: errors.length === 0, errors }
}

/**
 * Select best drive by health, priority, available storage.
 * @param {Array<object>} drives
 * @returns {object|null}
 */
export function selectBestDrive(drives) {
  const list = Array.isArray(drives) ? drives.filter((d) => d.status === true || d.status === 1) : []
  if (list.length === 0) return null
  const healthy = list.filter((d) => (d.health_status || 'healthy') === 'healthy')
  const pool = healthy.length ? healthy : list
  // sort priority asc, then available desc
  return [...pool].sort((a, b) => {
    const pa = Number(a.priority ?? 99)
    const pb = Number(b.priority ?? 99)
    if (pa !== pb) return pa - pb
    return Number(b.available_storage || 0) - Number(a.available_storage || 0)
  })[0] || null
}

/**
 * Detect drives needing rebalance (usage >80%).
 * @param {Array<object>} drives
 * @returns {Array<object>}
 */
export function detectImbalancedDrives(drives) {
  const list = Array.isArray(drives) ? drives : []
  return list.filter((d) => {
    const limit = Number(d.storage_limit)
    const used = Number(d.used_storage)
    if (!Number.isFinite(limit) || limit <= 0) return false
    return used / limit > 0.8
  })
}

/**
 * Check connectivity status.
 * @param {object} drive
 * @param {number} lastSyncMs - epoch ms
 * @param {number} nowMs
 * @returns {'healthy'|'stale'|'offline'}
 */
export function driveConnectivityStatus(drive, lastSyncMs, nowMs = Date.now()) {
  if (!drive) return 'offline'
  if (drive.health_status === 'critical' || drive.health_status === 'offline') return 'offline'
  if (!Number.isFinite(lastSyncMs)) return 'stale'
  const age = nowMs - lastSyncMs
  if (age > 10 * 60_000) return 'stale'
  return 'healthy'
}

/**
 * Generate daily uploads from documents.
 * @param {Array<object>} docs
 * @param {number} days
 * @param {Date} now
 * @returns {Array<{date:string,count:number}>}
 */
export function dailyUploads(docs, days = 7, now = new Date()) {
  const safe = Math.max(1, Number(days) || 7)
  const buckets = new Map()
  const points = []
  for (let i = safe - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    const k = d.toISOString().slice(0, 10)
    points.push({ date: k, count: 0 })
    buckets.set(k, points.length - 1)
  }
  for (const doc of Array.isArray(docs) ? docs : []) {
    const k = doc.created_at ? new Date(doc.created_at).toISOString().slice(0, 10) : null
    if (k && buckets.has(k)) points[buckets.get(k)].count += 1
  }
  return points
}

/**
 * Totaux par faculté / département.
 */
export function docsByFaculty(docs) {
  const map = new Map()
  for (const d of Array.isArray(docs) ? docs : []) {
    const key = String(d.faculty_id || d.faculty?.id || 'unknown')
    const entry = map.get(key) || { key, label: key === 'unknown' ? 'Non classé' : `Faculté ${key}`, count: 0 }
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export function docsByDepartment(docs) {
  const map = new Map()
  for (const d of Array.isArray(docs) ? docs : []) {
    const key = String(d.department_id || d.department?.id || 'unknown')
    const entry = map.get(key) || { key, label: key === 'unknown' ? 'Non classé' : `Département ${key}`, count: 0 }
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

/**
 * Totaux manquants (cours sans doc récent).
 * @param {Array<object>} courses
 * @param {Array<object>} docs
 * @param {number} cutoffDays
 * @param {Date} now
 */
export function missingDocuments(courses, docs, cutoffDays = 30, now = new Date()) {
  const cutoff = now.getTime() - cutoffDays * 86400000
  const byCourse = new Map()
  for (const d of Array.isArray(docs) ? docs : []) {
    const cid = String(d.course_id || '')
    if (!cid) continue
    if (!byCourse.has(cid)) byCourse.set(cid, [])
    byCourse.get(cid).push(d)
  }
  const missing = []
  for (const c of Array.isArray(courses) ? courses : []) {
    const lst = byCourse.get(String(c.id)) || []
    const hasRecent = lst.some((d) => Number(new Date(d.created_at).getTime()) >= cutoff)
    if (lst.length === 0 || !hasRecent) missing.push(c)
  }
  return missing
}

/**
 * Integrity verification (frontend heuristic).
 * @param {Array<object>} docs
 * @param {Array<object>} drives
 * @returns {{broken: Array<object>, warnings: string[]}}
 */
export function verifyIntegrity(docs, drives) {
  const driveIds = new Set((Array.isArray(drives) ? drives : []).map((d) => String(d.id)))
  const broken = []
  const warnings = []
  for (const d of Array.isArray(docs) ? docs : []) {
    if (d.google_drive_id && !driveIds.has(String(d.google_drive_id))) broken.push(d)
  }
  if (broken.length) warnings.push(`${broken.length} document(s) référencent un drive manquant.`)
  return { broken, warnings }
}

/**
 * Scheduled cleanup candidates (failed/old pending >7j).
 * @param {Array<object>} docs
 * @param {Date} now
 */
export function cleanupCandidates(docs, now = new Date()) {
  const cutoff = now.getTime() - 7 * 86400000
  return (Array.isArray(docs) ? docs : []).filter((d) => {
    const t = new Date(d.created_at || d.updated_at).getTime()
    if (!Number.isFinite(t) || t > cutoff) return false
    return d.status === 'failed' || d.status === 'pending'
  })
}
