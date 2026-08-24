/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Department
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `departments` du backend Laravel 13.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Department — opérateurs CRUD.
 */
export const DepartmentApi = {
  /**
   * Récupère la liste de tous les départements.
   * @returns {Promise<any>} Tableau d'objets département.
   */
  list() {
    return httpService.get('/departments')
  },

  /**
   * Récupère un département par son ID.
   * @param {number|string} id - Identifiant du département.
   * @returns {Promise<any>} Objet département.
   */
  get(id) {
    return httpService.get(`/departments/${id}`)
  },

  /**
   * Crée un nouveau département.
   * @param {object} data - Données du département (name, code, faculty_id, etc.).
   * @returns {Promise<any>} Département créé.
   */
  create(data) {
    return httpService.post('/departments', data)
  },

  /**
   * Met à jour un département par ID (remplacement complet).
   * @param {number|string} id - Identifiant du département.
   * @param {object} data - Nouvelles données du département.
   * @returns {Promise<any>} Département mis à jour.
   */
  update(id, data) {
    return httpService.put(`/departments/${id}`, data)
  },

  /**
   * Met à jour un département par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant du département.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Département mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/departments/${id}`, data)
  },

  /**
   * Supprime un département par ID.
   * @param {number|string} id - Identifiant du département.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/departments/${id}`)
  },
}