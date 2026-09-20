/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Gamification (niveaux dynamiques + réciprocité)
 * ---------------------------------------------------------------------------
 * Niveaux calculés en direct depuis le compteur de dépôts approuvés
 * (`user.uploads_count`, exposé par GET /me). Aucune donnée fabriquée :
 * compteur absent => niveau Observateur.
 */

export const GAMIFICATION_LEVELS = Object.freeze([
  { key: 'observateur', min: 0, max: 0, label: 'Observateur', icon: '👁' },
  { key: 'contributeur', min: 1, max: 3, label: 'Contributeur', icon: '🤝' },
  { key: 'major', min: 4, max: 9, label: 'Major de Promo', icon: '⭐' },
  { key: 'legende', min: 10, max: Infinity, label: 'Légende de la Faculté', icon: '🏆' },
])

/** Seuils de téléchargements/jour déclenchant le prompt de réciprocité. */
export const RECIPROCITY_THRESHOLDS = Object.freeze([3, 4])

/** Nom de l'évènement DOM émis à chaque palier atteint. */
export const RECIPROCITY_EVENT = 'alphix:reciprocity'

/**
 * Niveau d'un utilisateur selon ses dépôts approuvés.
 * @param {number|string|null|undefined} uploadCount - Compteur brut.
 * @returns {{key: string, label: string, icon: string}} Niveau actif.
 */
export function levelForUploadCount(uploadCount) {
  const n = Number(uploadCount)
  const safe = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  return GAMIFICATION_LEVELS.find((l) => safe >= l.min && safe <= l.max) || GAMIFICATION_LEVELS[0]
}

/**
 * Badges débloqués pour un compteur donné.
 * @param {number|string|null|undefined} uploadCount - Compteur brut.
 * @returns {Array<{key: string, label: string, icon: string}>} Badges actifs.
 */
export function badgesForUploadCount(uploadCount) {
  const n = Number(uploadCount)
  const safe = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  const badges = []
  if (safe >= 1) badges.push({ key: 'entraide', label: "L'Entraide", icon: '🤝' })
  if (safe >= 4) badges.push({ key: 'vip', label: 'VIP', icon: '⭐' })
  if (safe >= 10) badges.push({ key: 'legende', label: 'Légende', icon: '🏆' })
  return badges
}

/**
 * Clé localStorage du compteur journalier de téléchargements.
 * @param {Date} [now] - Référence temporelle.
 * @returns {string} Clé du jour.
 */
export function dailyDownloadKey(now = new Date()) {
  return `alphix:dl:${now.toISOString().slice(0, 10)}`
}

/**
 * Lit le compteur de téléchargements du jour (session locale).
 * @returns {number} Total du jour.
 */
export function readDailyDownloads() {
  try {
    return Number(window.localStorage.getItem(dailyDownloadKey()) || 0) || 0
  } catch {
    return 0
  }
}

/**
 * Incrémente le compteur journalier. Émet RECIPROCITY_EVENT quand un palier
 * (3 ou 4) est atteint pour la première fois de la journée.
 * @returns {{count: number, thresholdHit: boolean}} Compteur + palier atteint.
 */
export function recordDailyDownload() {
  let count = 0
  try {
    count = readDailyDownloads() + 1
    window.localStorage.setItem(dailyDownloadKey(), String(count))
    const seenKey = `${dailyDownloadKey()}:prompted:${count}`
    const thresholdHit = RECIPROCITY_THRESHOLDS.includes(count)
      && !window.localStorage.getItem(seenKey)
    if (thresholdHit) window.localStorage.setItem(seenKey, '1')
    if (thresholdHit && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(RECIPROCITY_EVENT, { detail: { count } }))
    }
    return { count, thresholdHit }
  } catch {
    return { count, thresholdHit: false }
  }
}
