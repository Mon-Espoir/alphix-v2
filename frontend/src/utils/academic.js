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
 * Resout les identifiants academiques d'un cours, que l'API expose les
 * colonnes brutes (department_id...) ou uniquement les relations imbriquees
 * (department.id, department.faculty.id, level.id, semester.id).
 * @param {object|null} course - Cours API.
 * @returns {{facultyId: string, departmentId: string, levelId: string, semesterId: string}}
 */
export function resolveCourseIds(course) {
  return {
    facultyId: String(
      course?.faculty_id ?? course?.department?.faculty_id ?? course?.department?.faculty?.id ?? '',
    ),
    departmentId: String(course?.department_id ?? course?.department?.id ?? ''),
    levelId: String(course?.level_id ?? course?.level?.id ?? ''),
    semesterId: String(course?.semester_id ?? course?.semester?.id ?? ''),
  }
}

/**
 * Resout la faculte d'un departement (colonne brute OU relation imbriquee).
 * @param {object|null} department - Departement API.
 * @returns {string} Identifiant de faculte ('' si inconnu).
 */
export function resolveDepartmentFacultyId(department) {
  return String(
    department?.faculty_id ?? department?.faculty?.id ?? '',
  )
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
 * Retourne le semestre académique réel (1..12) depuis un cours.
 * Source de vérité: JSON → level (BAC1..BAC6) + semester (S1/S2) → global.
 * Ex: BAC3/S1 → 5, BAC3/S2 → 6, BAC4/S1 → 7 (Médecine).
 * Supporte 2 sources: relation imbriquée (course.level.code) OU lookup par IDs.
 *
 * @param {object|null} course - Cours API avec level/semester.
 * @param {{levels?: Array<object>, semesters?: Array<object>}} [lookup] - optionnel: tables de référence pour fallback par IDs
 * @returns {number|null} Numéro global ou null.
 */
export function getGlobalSemester(course, lookup = {}) {
  let levelCode = course?.level?.code || course?.level_code || ''
  let semCode = course?.semester?.code || course?.semester_code || ''
  // Fallback par IDs si codes absents (API sans eager load)
  if ((!levelCode || !semCode) && lookup.levels && lookup.semesters) {
    const lvl = lookup.levels.find((l) => String(l.id) === String(course?.level_id ?? course?.level?.id ?? ''))
    const sem = lookup.semesters.find((s) => String(s.id) === String(course?.semester_id ?? course?.semester?.id ?? ''))
    if (lvl) levelCode = lvl.code || levelCode
    if (sem) semCode = sem.code || semCode
  }
  if (!levelCode || !semCode) return null
  const m = String(levelCode).match(/^BAC(\d+)$/)
  if (m) {
    const bac = Number(m[1])
    const semInBac = semCode === 'S1' ? 1 : 2
    return (bac - 1) * 2 + semInBac
  }
  // Fallback M1/M2 (compatibilité)
  if (levelCode === 'M1') return semCode === 'S1' ? 7 : 8
  if (levelCode === 'M2') return semCode === 'S1' ? 9 : 10
  return null
}

/**
 * Libellé semestre réel pour affichage.
 * Ex: "Semestre 5" pour BAC3/S1, "Semestre 7" pour BAC4/S1 (Médecine).
 * IMPORTANT: ne retombe JAMAIS sur semester.name (S1) qui affiche faux semestre.
 *
 * @param {object|null} course
 * @param {{levels?: Array<object>, semesters?: Array<object>}} [lookup]
 * @returns {string} "Semestre X" ou "".
 */
export function semesterLabel(course, lookup = {}) {
  const n = getGlobalSemester(course, lookup)
  if (n) return `Semestre ${n}`
  // Si global indisponible, ne pas afficher S1/S2 brut (affichage faux). Retour vide.
  return ''
}

/**
 * Label semestre tenant compte du niveau (BAC3 S1 => Semestre 5).
 * Si levelCode est BACn, calcule le semestre global (1..12), sinon retombe sur semester.name/code.
 * @param {string} levelCode - ex: BAC3
 * @param {object|null} semester - objet semestre {code, name}
 * @returns {string} label ex: Semestre 5
 */
export function formatSemesterForLevel(levelCode, semester) {
  if (!semester) return ''
  const lc = String(levelCode || '').trim()
  const semCode = String(semester?.code || '').trim()
  const m = lc.match(/^BAC(\d+)$/)
  if (m && (semCode === 'S1' || semCode === 'S2')) {
    const bac = Number(m[1])
    const semInBac = semCode === 'S1' ? 1 : 2
    const global = (bac - 1) * 2 + semInBac
    return `Semestre ${global}`
  }
  return semester.name || semester.code || ''
}

/**
 * Options semestre labelisées selon le niveau sélectionné.
 * BAC3 => S1 devient Semestre 5, S2 => Semestre 6.
 * @param {Array<object>} semesters - liste semestres API
 * @param {string} levelCode - code niveau sélectionné
 * @returns {Array<{value: number|string, label: string}>}
 */
export function semesterOptionsForLevel(semesters, levelCode) {
  if (!Array.isArray(semesters)) return []
  const lc = String(levelCode || '').trim()
  const isBac = /^BAC(\d+)$/.test(lc)
  return semesters.map((sem) => {
    const label = isBac ? formatSemesterForLevel(lc, sem) : (sem.name || sem.code || '')
    return { value: sem.id, label, raw: sem }
  })
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