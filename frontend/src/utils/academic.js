/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Helpers academiques partages
 * ---------------------------------------------------------------------------
 * Fonctions pures mutualisees par les pages Departments, Levels, Semesters et
 * Courses. Centralisent la normalisation des reponses API Laravel et les
 * accesseurs defensifs (champ absent => valeur neutre). Aucune donnee n'est
 * jamais fabriquee : seul le contenu reellement renvoye par l'API est rendu.
 */

/**
 * Normalise une reponse API en tableau.
 * Accepte soit un tableau brut, soit une reponse paginee Laravel `{ data }`.
 *
 * @param {unknown} response - Corps de reponse renvoye par un service API.
 * @returns {Array<object>} Tableau d'elements (vide si aucune donnee).
 */
export function normalizeApiList(response) {
  if (Array.isArray(response)) return response
  if (response && Array.isArray(response.data)) return response.data
  return []
}

/**
 * Extrait les meta-donnees de pagination d'une reponse Laravel paginee.
 *
 * @param {unknown} response - Reponse API brute.
 * @returns {{currentPage: number, lastPage: number, total: number, perPage: number}|null}
 *   Objet de pagination, ou `null` si la reponse ne comporte pas de metas.
 */
export function normalizeApiPagination(response) {
  if (
    response &&
    typeof response === 'object' &&
    !Array.isArray(response) &&
    response.last_page
  ) {
    return {
      currentPage: response.current_page || 1,
      lastPage: response.last_page || 1,
      total: response.total || 0,
      perPage: response.per_page || 15,
    }
  }
  return null
}

/**
 * Produit la liste d'options exploitable par un <select> natif.
 *
 * @param {Array<object>|null} items - Elements bruts de l'API.
 * @param {{valueKey?: string, labelKey?: string}} [opts] - Cles optionnelles.
 * @returns {Array<{value: number|string, label: string}>} Options triees des valeurs non vides.
 */
export function toSelectOptions(items, { valueKey = 'id', labelKey = 'name' } = {}) {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const options = []
  for (const item of items) {
    const value = item?.[valueKey]
    if (value == null || seen.has(value)) continue
    seen.add(value)
    options.push({ value, label: item?.[labelKey] ?? '' })
  }
  return options
}

/**
 * Resout le nom d'une relation imbriquee de maniere defensive.
 * Ex. `relationName(department, 'faculty')` renvoie `department.faculty.name`.
 *
 * @param {object|null} entity - Entite source.
 * @param {string} relationKey - Cle de la relation imbriquee.
 * @param {string} [nameKey='name'] - Cle du libelle cible.
 * @returns {string} Libelle, ou chaine vide si aucune donnee.
 */
export function relationName(entity, relationKey, nameKey = 'name') {
  return entity?.[relationKey]?.[nameKey] ?? ''
}

/**
 * Compte des elements lies a une entite de facon defensive.
 * Priorite a un compteur explicite, puis a la longuer d'une relation tableau.
 *
 * @param {object|null} entity - Entite source.
 * @param {{countKey?: string, arrayKey?: string}} [opts] - Cles de compte.
 * @returns {number|null} Nombre reel, ou `null` si indisponible.
 */
export function countOf(entity, { countKey = '', arrayKey = '' } = {}) {
  const countValue = entity?.[countKey]
  if (typeof countValue === 'number') return countValue
  const arrayValue = entity?.[arrayKey]
  if (Array.isArray(arrayValue)) return arrayValue.length
  return null
}

/**
 * Indique si le statut boolean d'une entite est actif.
 * Le defaut back (status null/absent) est considere actif.
 *
 * @param {boolean|number|1|0|undefined} status - Statut brut de l'API.
 * @returns {boolean} Vrai si actif.
 */
export function isActiveStatus(status) {
  return status === true || status === 1 || status === null || status === undefined
}

/**
 * Libelle lisible d'un statut boolean.
 *
 * @param {boolean|number|undefined} status - Statut brut de l'API.
 * @returns {string} 'Actif' ou 'Inactif'.
 */
export function statusLabel(status) {
  return isActiveStatus(status) ? 'Actif' : 'Inactif'
}

/**
 * Convertit un texte en slug URL (sans accents, tirets).
 * Utilise notamment pour generer la colonne `slug` exigee par la validation Laravel.
 *
 * @param {string} text - Texte source.
 * @returns {string} Slug normalise.
 */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}