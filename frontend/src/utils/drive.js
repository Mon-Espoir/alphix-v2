/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Helpers Google Drive & Stockage (purs)
 * ---------------------------------------------------------------------------
 * Fonctions pures mutualisees par le module Stockage : tri par priorite,
 * evaluation de sante, calculs d'occupation, selection du drive cible.
 * Contrats alignes sur `GoogleDriveResource` (API Laravel) : storage_limit,
 * used_storage, available_storage, priority, health_status, is_default, status.
 */

/** Seuils d'occupation declenchant les degradations de sante. */
export const DRIVE_HEALTH_THRESHOLDS = Object.freeze({
  WARNING_RATIO: 0.8,
  CRITICAL_RATIO: 0.95,
})

/**
 * Trie une liste de drives par priorite croissante (1 = prioritaire),
 * puis par nom pour un ordre stable a priorite egale. Liste source non mutee.
 *
 * @param {Array<object>|null} drives - Drives bruts API.
 * @returns {Array<object>} Nouvelle liste triee.
 */
export function sortDrivesByPriority(drives) {
  if (!Array.isArray(drives)) return []
  return [...drives].sort((a, b) => {
    const pa = Number(a?.priority)
    const pb = Number(b?.priority)
    const safePa = Number.isFinite(pa) ? pa : Number.MAX_SAFE_INTEGER
    const safePb = Number.isFinite(pb) ? pb : Number.MAX_SAFE_INTEGER
    if (safePa !== safePb) return safePa - safePb
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'fr', { sensitivity: 'base' })
  })
}

/**
 * Calcule le ratio d'occupation d'un drive (0-1).
 * @param {object|null} drive - Drive API.
 * @returns {number|null} Ratio, ou null si la limite est absente/invalide.
 */
export function computeUsageRatio(drive) {
  const limit = Number(drive?.storage_limit)
  if (!Number.isFinite(limit) || limit <= 0) return null
  const used = Math.max(0, Number(drive?.used_storage) || 0)
  return Math.min(1, used / limit)
}

/**
 * Evalue la sante effective d'un drive : statut serveur croise avec les
 * seuils d'occupation calcules (degradation locale si l'espace critique).
 *
 * @param {object|null} drive - Drive API.
 * @returns {'healthy'|'warning'|'critical'} Sante consolidee.
 */
export function assessDriveHealth(drive) {
  const serverStatus = drive?.health_status
  const ratio = computeUsageRatio(drive)

  if (ratio != null && ratio >= DRIVE_HEALTH_THRESHOLDS.CRITICAL_RATIO) return 'critical'
  if (serverStatus === 'critical') return 'critical'
  if (ratio != null && ratio >= DRIVE_HEALTH_THRESHOLDS.WARNING_RATIO) return 'warning'
  if (serverStatus === 'warning') return 'warning'
  return 'healthy'
}

/**
 * Variante Badge design system associee a une sante de drive.
 * @param {string|null} health - Sante brute ou consolidee.
 * @returns {'success'|'warning'|'danger'} Variante Badge.
 */
export function driveHealthBadgeVariant(health) {
  if (health === 'critical') return 'danger'
  if (health === 'warning') return 'warning'
  return 'success'
}

/**
 * Libelle lisible d'une sante de drive.
 * @param {string|null} health - Sante brute.
 * @returns {string} Libelle FR.
 */
export function driveHealthLabel(health) {
  if (health === 'critical') return 'Critique'
  if (health === 'warning') return 'Attention'
  return 'Sain'
}

/**
 * Libelle lisible d'un type de drive.
 * @param {string|null} type - Type brut API ('personal'|'shared_drive'|'service_account').
 * @returns {string} Libelle FR ou valeur brute.
 */
export function driveTypeLabel(type) {
  switch (type) {
    case 'personal':
      return 'Personnel'
    case 'shared_drive':
      return 'Drive partage'
    case 'service_account':
      return 'Compte de service'
    default:
      return String(type ?? '-')
  }
}

/**
 * Indique si un drive peut accepter un nouvel envoi :
 * actif, non critique et disposant encore d'espace declare suffisant.
 *
 * @param {object|null} drive - Drive API.
 * @param {{requiredBytes?: number}} [opts] - Besoin optionnel du fichier entrant.
 * @returns {boolean} true si utilisable comme cible.
 */
export function canAcceptUpload(drive, opts = {}) {
  if (!drive || typeof drive !== 'object') return false
  const enabled = drive.status === true || drive.status === 1
  if (!enabled) return false
  if (assessDriveHealth(drive) === 'critical') return false

  const available = Number(drive.available_storage)
  if (Number.isFinite(available)) {
    const required = Math.max(0, Number(opts.requiredBytes) || 0)
    if (available <= 0 && required > 0) return false
    if (required > available) return false
    if (!Number.isFinite(Number(opts.requiredBytes)) && available <= 0) return false
  }
  return true
}

/**
 * SELECTION DU DRIVE CIBLE — handler pur reutilisable.
 * Parmi les drives actifs tries par priorite, retourne le premier capable
 * d'accueillir le fichier. Le drive par defaut sert de repli explicite.
 *
 * @param {Array<object>|null} drives - Drives actifs (ordre quelconque).
 * @param {{requiredBytes?: number}} [opts] - Taille du fichier entrant.
 * @returns {object|null} Drive selectionne, ou null si aucun candidat.
 */
export function selectTargetDrive(drives, opts = {}) {
  const ordered = sortDrivesByPriority(Array.isArray(drives) ? drives : []).filter((drive) => drive.status === true || drive.status === 1)
  for (const drive of ordered) {
    if (canAcceptUpload(drive, opts)) return drive
  }
  return ordered.find((drive) => Boolean(drive.is_default)) ?? null
}

/**
 * Calcule les totaux agreges d'une flotte de drives actifs.
 * Aucune invention : les valeurs absentes sont traitees comme nulles et
 * `hasCapacityData` signale l'absence totale de quotas declares.
 *
 * @param {Array<object>|null} drives - Drives API.
 * @returns {{totalLimit: number|null, totalUsed: number, totalAvailable: number, hasCapacityData: boolean}} Totaux.
 */
export function aggregateStorage(drives) {
  const list = Array.isArray(drives) ? drives : []
  let hasLimit = false
  let totalLimit = 0
  let totalUsed = 0
  let totalAvailable = 0

  for (const drive of list) {
    const used = Number(drive?.used_storage)
    const available = Number(drive?.available_storage)
    const limit = Number(drive?.storage_limit)

    if (Number.isFinite(used) && used > 0) totalUsed += used
    if (Number.isFinite(available) && available > 0) totalAvailable += available
    if (Number.isFinite(limit) && limit > 0) {
      hasLimit = true
      totalLimit += limit
    }
  }

  return {
    totalLimit: hasLimit ? totalLimit : null,
    totalUsed,
    totalAvailable,
    hasCapacityData: hasLimit,
  }
}

/**
 * Genere les instructions de permutation de priorite entre deux drives
 * (handler pur : aucune mutation directe, la persistance reste aux pages).
 *
 * @param {Array<object>} drives - Drives tries par priorite.
 * @param {number|string} driveId - Drive deplace.
 * @param {-1|1} direction - Direction (-1 = monter, +1 = descendre).
 * @returns {Array<{id: number|string, priority: number}>|null} Patches a appliquer, ou null si impossible.
 */
export function buildPrioritySwap(drives, driveId, direction) {
  const ordered = sortDrivesByPriority(drives)
  const index = ordered.findIndex((drive) => String(drive?.id) === String(driveId))
  if (index < 0) return null

  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= ordered.length) return null

  const current = ordered[index]
  const target = ordered[targetIndex]
  if (current == null || target == null) return null

  return [
    { id: current.id, priority: Number(target.priority) },
    { id: target.id, priority: Number(current.priority) },
  ]
}
