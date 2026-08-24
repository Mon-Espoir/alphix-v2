/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Semester
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `semesters` du backend Laravel 13.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Semester — opérateurs CRUD + endpoint spécialisé.
 */
export const SemesterApi = {
  /**
   * Récupère la liste de tous les semestres.
   * @returns {Promise<any>} Tableau d'objets semestre.
   */
  list() {
    return httpService.get('/semesters')
  },

  /**
   * Récupère un semestre par son ID.
   * @param {number|string} id - Identifiant du semestre.
   * @returns {Promise<any>} Objet semestre.
   */
  get(id) {
    return httpService.get(`/semesters/${id}`)
  },

  /**
   * Crée un nouveau semestre.
   * @param {object} data - Données du semestre (name, code, start_date, end_date, is_active, etc.).
   * @returns {Promise<any>} Semestre créé.
   */
  create(data) {
    return httpService.post('/semesters', data)
  },

  /**
   * Met à jour un semestre par ID (remplacement complet).
   * @param {number|string} id - Identifiant du semestre.
   * @param {object} data - Nouvelles données du semestre.
   * @returns {Promise<any>} Semestre mis à jour.
   */
  update(id, data) {
    return httpService.put(`/semesters/${id}`, data)
  },

  /**
   * Met à jour un semestre par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant du semestre.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Semestre mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/semesters/${id}`, data)
  },

  /**
   * Supprime un semestre par ID.
   * @param {number|string} id - Identifiant du semestre.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/semesters/${id}`)
  },

  /**
   * Récupère les semestres actifs ordonnés.
   * @returns {Promise<any>} Tableau de semestres actifs triés.
   */
  getActiveOrdered() {
    return httpService.get('/semesters/active-ordered')
  },
}