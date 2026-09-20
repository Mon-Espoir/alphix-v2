/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Helpers Upload (purs)
 * ---------------------------------------------------------------------------
 * Fonctions pures mutualisees par le module Upload & Stockage :
 *   - validation stricte client-side (MIME + taille, miroir backend) ;
 *   - hachage SHA-256 local chunked, annulable, avec progression reelle ;
 *   - detection de doublons cote client (file d'attente) ;
 *   - calculs de progression agregee, vitesse et ETA ;
 *   - politique de retry exponentiel.
 * Aucune donnee n'est fabriquee : toute valeur absente est rendue neutre.
 */

import {
  UPLOAD_CONSTRAINTS,
  UPLOAD_RETRY_POLICY,
  HASH_CHUNK_SIZE,
  UPLOAD_ITEM_STATUS,
} from '../constants/upload'

/**
 * Formate une taille en octets en chaine lisible (unites FR).
 * @param {number|string|null} bytes - Taille brute.
 * @returns {string} Taille formatee ou '-' si absente/invalide.
 */
export function formatBytes(bytes) {
  if (bytes == null || bytes === '') return '-'
  const size = Number(bytes)
  if (!Number.isFinite(size) || size < 0) return '-'
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} Mo`
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

/**
 * Formate une vitesse de transfert en chaine lisible.
 * @param {number|null} bytesPerSecond - Vitesse en octets/seconde.
 * @returns {string} Vitesse formatee (ex. '2.3 Mo/s') ou '-'.
 */
export function formatSpeed(bytesPerSecond) {
  const speed = Number(bytesPerSecond)
  if (!Number.isFinite(speed) || speed <= 0) return '-'
  return `${formatBytes(speed)}/s`
}

/**
 * Formate une duree en millisecondes en chaine lisible.
 * @param {number|null} ms - Duree en millisecondes.
 * @returns {string} Duree formatee ('800 ms', '2.5 s', '1 min 05 s') ou '-'.
 */
export function formatDuration(ms) {
  if (ms == null || ms === '') return '-'
  const duration = Number(ms)
  if (!Number.isFinite(duration) || duration < 0) return '-'
  if (duration < 1000) return `${Math.round(duration)} ms`
  const totalSeconds = duration / 1000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)} s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`
}

/**
 * Valide strictement un fichier contre les contraintes du backend
 * (liste blanche MIME + taille maximale). Aucune tolerance locale.
 *
 * @param {{name?: string, size?: number, type?: string}|File|null} file - Fichier ou metadonnees.
 * @param {{maxSizeBytes?: number, allowedMimeTypes?: string[]}} [constraints] - Contraintes optionnelles (defaut backend).
 * @returns {{valid: boolean, errors: string[]}} Verdict + messages FR.
 */
export function validateUploadFile(file, constraints = {}) {
  const maxSizeBytes = constraints.maxSizeBytes ?? UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES
  const allowedMimeTypes = constraints.allowedMimeTypes ?? UPLOAD_CONSTRAINTS.ALLOWED_MIME_TYPES

  if (!file || typeof file !== 'object') {
    return { valid: false, errors: ['Fichier introuvable.'] }
  }

  const errors = []
  const size = Number(file.size)

  if (!Number.isFinite(size) || size <= 0) {
    errors.push('Le fichier est vide ou illisible.')
  } else if (size > maxSizeBytes) {
    errors.push(`Le fichier depasse la taille maximale autorisee (${formatBytes(maxSizeBytes)}).`)
  }

  const mimeType = typeof file.type === 'string' ? file.type : ''
  if (!allowedMimeTypes.includes(mimeType)) {
    errors.push('Type de fichier non autorise (PDF, Word, PowerPoint, JPEG ou PNG attendu).')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Calcule l'empreinte SHA-256 hexadecimale d'un fichier par chunks.
 * Progression reelle (octets lus), annulable via AbortSignal, sans chargement
 * integral du fichier en memoire (mobile-first : fichiers jusqu'a 50 Mo).
 *
 * @param {File|Blob} file - Fichier source.
 * @param {{signal?: AbortSignal, onProgress?: (bytesRead: number, totalBytes: number) => void}} [opts]
 * @returns {Promise<string>} Empreinte hexadecimale (64 caracteres).
 * @throws {DOMException} 'AbortError' si le signal est active.
 */
export async function computeFileSha256(file, opts = {}) {
  if (!file || typeof file.slice !== 'function') {
    throw new TypeError('computeFileSha256 : fichier invalide.')
  }
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error("Web Crypto indisponible dans cet environnement.")
  }

  const { signal, onProgress } = opts
  const totalBytes = Number(file.size) || 0
  const digestLength = 64

  /** Concatenation des buffers lus avant digest final. */
  const chunks = []
  let offset = 0

  while (offset < totalBytes) {
    if (signal?.aborted) {
      throw new DOMException('Hachage annule.', 'AbortError')
    }
    const end = Math.min(offset + HASH_CHUNK_SIZE, totalBytes)
    const slice = file.slice(offset, end)
    const buffer = await slice.arrayBuffer()
    if (signal?.aborted) {
      throw new DOMException('Hachage annule.', 'AbortError')
    }
    chunks.push(new Uint8Array(buffer))
    offset = end
    if (typeof onProgress === 'function') onProgress(offset, totalBytes)
  }

  // Fichier vide : un unique buffer vide (SHA-256 du contenu nul).
  if (chunks.length === 0) chunks.push(new Uint8Array(0))

  const merged = mergeUint8Arrays(chunks)
  const digest = await crypto.subtle.digest('SHA-256', merged)

  const hexParts = new Array(digestLength)
  const bytes = new Uint8Array(digest)
  for (let i = 0; i < bytes.length; i += 1) {
    hexParts[i] = bytes[i].toString(16).padStart(2, '0')
  }
  return hexParts.join('')
}

/**
 * Fusionne une liste de Uint8Array en un seul tableau (sans dependance Buffer).
 * @param {Uint8Array[]} parts - Segments a concatener.
 * @returns {Uint8Array} Tableau fusionne.
 */
function mergeUint8Arrays(parts) {
  if (parts.length === 1) return parts[0]
  let total = 0
  for (const part of parts) total += part.length
  const out = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    out.set(part, cursor)
    cursor += part.length
  }
  return out
}

/**
 * Detection de doublons CLIENT au sein d'une liste de fichiers :
 * meme empreinte (nom + taille + date de modification) => collision.
 *
 * @param {Array<{name?: string, size?: number, lastModified?: number}>|FileList} files - Candidats.
 * @returns {Map<number, number>} Map index duplique -> index original.
 */
export function detectLocalDuplicates(files) {
  const list = Array.from(files ?? [])
  /** @type {Map<string, number>} Cle d'identite -> premier index rencontre. */
  const seen = new Map()
  const collisions = new Map()

  list.forEach((file, index) => {
    const identity = [
      typeof file?.name === 'string' ? file.name.toLowerCase() : '',
      Number(file?.size) || 0,
      Number(file?.lastModified) || 0,
    ].join('::')
    if (seen.has(identity)) {
      collisions.set(index, seen.get(identity))
    } else {
      seen.set(identity, index)
    }
  })

  return collisions
}

/**
 * Detecte les doublons par empreinte SHA-256 au sein d'elements de file deja
 * connus (meme contenu binaire, noms differents).
 *
 * @param {string|null} hash - Empreinte du fichier entrant.
 * @param {Array<{hash?: string|null, status?: string}>} existingItems - Elements existants.
 * @returns {object|null} Element existant en collision, ou null.
 */
export function findQueueHashCollision(hash, existingItems) {
  if (!hash || !Array.isArray(existingItems)) return null
  return (
    existingItems.find(
      (item) => item.hash === hash && item.status !== UPLOAD_ITEM_STATUS.FAILED,
    ) || null
  )
}

/**
 * Agrege la progression de plusieurs elements de file en un pourcentage global.
 * Les elements termines comptent pour 100 %, les echecs/annules sont exclus
 * du denominateur (progression honnete du travail restant).
 *
 * @param {Array<{status?: string, progress?: number}>} items - Elements de file.
 * @returns {number} Pourcentage global 0-100 (entier).
 */
export function aggregateProgress(items) {
  if (!Array.isArray(items) || items.length === 0) return 0
  const counted = items.filter((item) => !isTerminalStatus(item?.status))
  if (counted.length === 0) return 100
  const sum = counted.reduce((acc, item) => acc + clampPercent(item?.progress), 0)
  return Math.round(sum / counted.length)
}

/**
 * Borne un pourcentage entre 0 et 100.
 * @param {number|null} value - Valeur brute.
 * @returns {number} Valeur bornee.
 */
export function clampPercent(value) {
  const percent = Number(value)
  if (!Number.isFinite(percent)) return 0
  return Math.min(100, Math.max(0, percent))
}

/**
 * Indique si un statut est terminal (plus aucune transition prevue).
 * @param {string|null} status - Statut brut.
 * @returns {boolean} true si terminal.
 */
export function isTerminalStatus(status) {
  return (
    status === UPLOAD_ITEM_STATUS.UPLOADED ||
    status === UPLOAD_ITEM_STATUS.FAILED ||
    status === UPLOAD_ITEM_STATUS.CANCELLED
  )
}

/**
 * Indique si un statut correspond a un traitement actif.
 * @param {string|null} status - Statut brut.
 * @returns {boolean} true si actif.
 */
export function isActiveStatus(status) {
  return (
    status === UPLOAD_ITEM_STATUS.HASHING ||
    status === UPLOAD_ITEM_STATUS.CHECKING ||
    status === UPLOAD_ITEM_STATUS.UPLOADING
  )
}

/**
 * Calcule la vitesse instantanee lissée (moyenne mobile sur fenetre).
 * @param {number} loadedBytes - Octets transférés cumulés.
 * @param {number} startedAtMs - Horodatage de debut (performance.now()).
 * @param {number} nowMs - Horodatage courant.
 * @returns {number|null} Vitesse en octets/s, ou null si non mesurable.
 */
export function computeTransferSpeed(loadedBytes, startedAtMs, nowMs) {
  const elapsedSeconds = (Number(nowMs) - Number(startedAtMs)) / 1000
  const loaded = Number(loadedBytes)
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0.2) return null
  if (!Number.isFinite(loaded) || loaded <= 0) return null
  return loaded / elapsedSeconds
}

/**
 * Estime le temps restant a partir de la vitesse courante.
 * @param {number} remainingBytes - Octets restants.
 * @param {number|null} bytesPerSecond - Vitesse courante.
 * @returns {number|null} ETA en ms, ou null si non estimable.
 */
export function estimateEta(remainingBytes, bytesPerSecond) {
  const remaining = Number(remainingBytes)
  const speed = Number(bytesPerSecond)
  if (!Number.isFinite(remaining) || remaining <= 0) return 0
  if (!Number.isFinite(speed) || speed <= 0) return null
  return (remaining / speed) * 1000
}

/**
 * Delai d'attente avant la nieme tentative (backoff exponentiel plafonne).
 * @param {number} attempt - Numero de tentative ecoule (1 => premiere erreur).
 * @param {{baseDelayMs?: number, factor?: number, maxDelayMs?: number}} [policy] - Politique.
 * @returns {number} Delai en millisecondes.
 */
export function computeRetryDelay(attempt, policy = {}) {
  const base = policy.baseDelayMs ?? UPLOAD_RETRY_POLICY.BASE_DELAY_MS
  const factor = policy.factor ?? UPLOAD_RETRY_POLICY.FACTOR
  const max = policy.maxDelayMs ?? UPLOAD_RETRY_POLICY.MAX_DELAY_MS
  const safeAttempt = Math.max(1, Number(attempt) || 1)
  return Math.min(base * factor ** (safeAttempt - 1), max)
}

/**
 * Incremente une version semantique simplifiee ("X.Y") du document.
 * Utilisee lors des resolutions de doublon (remplacement / revision).
 *
 * @param {string|null} version - Version courante brute API (ex. '1.0').
 * @param {'major'|'minor'} [kind='minor'] - Type d'increment.
 * @returns {string} Nouvelle version ('2.0', '1.1'), repli '1.1'/'2.0'.
 */
export function bumpDocumentVersion(version, kind = 'minor') {
  const match = /^(\d+)\.(\d+)$/.exec(String(version ?? '').trim())
  if (!match) return kind === 'major' ? '2.0' : '1.1'
  const major = Number(match[1])
  const minor = Number(match[2])
  return kind === 'major'
    ? `${major + 1}.0`
    : `${major}.${minor + 1}`
}

/**
 * Construit la serie de volume quotidien (N derniers jours) depuis un ledger.
 * Seuls les elements reellement envoyes (UPLOADED) alimentent les volumes.
 *
 * @param {Array<{status?: string, completedAt?: string|null, size?: number}>} items - Ledger brut.
 * @param {number} [days=7] - Nombre de jours a couvrir.
 * @param {Date} [now] - Reference temporelle (injection testable).
 * @returns {Array<{date: string, label: string, bytes: number, count: number}>} Serie ordonnee chronologique.
 */
export function buildDailyVolumeSeries(items, days = 7, now = new Date()) {
  const safeDays = Math.max(1, Number(days) || 7)
  const points = []
  const bounds = []

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - offset)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)
    points.push({
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      bytes: 0,
      count: 0,
    })
    bounds.push({ start: day.getTime(), end: nextDay.getTime() })
  }

  for (const item of Array.isArray(items) ? items : []) {
    if (item?.status !== UPLOAD_ITEM_STATUS.UPLOADED || !item?.completedAt) continue
    const timestamp = new Date(item.completedAt).getTime()
    if (!Number.isFinite(timestamp)) continue
    for (let i = 0; i < points.length; i += 1) {
      if (timestamp >= bounds[i].start && timestamp < bounds[i].end) {
        points[i].bytes += Number(item.size) || 0
        points[i].count += 1
        break
      }
    }
  }

  return points
}
