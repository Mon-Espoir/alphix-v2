/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Course
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `courses` du backend Laravel 13.
 * Note : L'index et le show sont exclus côté backend (apiResource except).
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Course — CRUD complet + recherche + liaison (source principale 867 cours).
 */
export const CourseApi = {
  /**
   * Récupère tous les cours avec compteur documents (LEFT JOIN).
   * @param {object} [params] - Filtres éventuels.
   * @returns {Promise<any>} Tableau de cours avec documents_count.
   */
  list(params) {
    return httpService.get('/courses', { params })
  },

  /**
   * Récupère un cours par son ID.
   * @param {number|string} id
   * @returns {Promise<any>}
   */
  get(id) {
    return httpService.get(`/courses/${id}`)
  },

  /**
   * Recherche des cours par texte (code/nom).
   * @param {object} params - {q ou query}
   * @returns {Promise<any>}
   */
  search(params) {
    return httpService.get('/courses/search', { params })
  },

  /**
   * Crée un nouveau cours.
   * @param {object} data - Données du cours (name, code, department_id, semester_id, level_id, credits, etc.).
   * @returns {Promise<any>} Cours créé.
   */
  create(data) {
    return httpService.post('/courses', data)
  },

  /**
   * Met à jour un cours par ID (remplacement complet).
   * @param {number|string} id - Identifiant du cours.
   * @param {object} data - Nouvelles données du cours.
   * @returns {Promise<any>} Cours mis à jour.
   */
  update(id, data) {
    return httpService.put(`/courses/${id}`, data)
  },

  /**
   * Met à jour un cours par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant du cours.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Cours mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/courses/${id}`, data)
  },

  /**
   * Supprime un cours par ID.
   * @param {number|string} id - Identifiant du cours.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/courses/${id}`)
  },

  /**
   * Récupère les cours d'un département donné.
   * @param {number|string} departmentId - Identifiant du département.
   * @returns {Promise<any>} Tableau de cours.
   */
  getByDepartment(departmentId) {
    return httpService.get(`/departments/${departmentId}/courses`)
  },

  /**
   * Récupère les cours d'un semestre donné.
   * @param {number|string} semesterId - Identifiant du semestre.
   * @returns {Promise<any>} Tableau de cours.
   */
  getBySemester(semesterId) {
    return httpService.get(`/semesters/${semesterId}/courses`)
  },

  /**
   * Récupère les cours d'un niveau donné.
   * @param {number|string} levelId - Identifiant du niveau.
   * @returns {Promise<any>} Tableau de cours.
   */
  getByLevel(levelId) {
    return httpService.get(`/levels/${levelId}/courses`)
  },
}