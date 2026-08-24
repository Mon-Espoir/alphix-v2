/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Faculty
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `faculties` du backend Laravel 13.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Faculty — opérateurs CRUD + liaison départements.
 */
export const FacultyApi = {
  /**
   * Récupère la liste de toutes les facultés.
   * @returns {Promise<any>} Tableau d'objets faculté.
   */
  list() {
    return httpService.get('/faculties')
  },

  /**
   * Récupère une faculté par son ID.
   * @param {number|string} id - Identifiant de la faculté.
   * @returns {Promise<any>} Objet faculté.
   */
  get(id) {
    return httpService.get(`/faculties/${id}`)
  },

  /**
   * Crée une nouvelle faculté.
   * @param {object} data - Données de la faculté (name, code, etc.).
   * @returns {Promise<any>} Faculté créée.
   */
  create(data) {
    return httpService.post('/faculties', data)
  },

  /**
   * Met à jour une faculté par ID (remplacement complet).
   * @param {number|string} id - Identifiant de la faculté.
   * @param {object} data - Nouvelles données de la faculté.
   * @returns {Promise<any>} Faculté mise à jour.
   */
  update(id, data) {
    return httpService.put(`/faculties/${id}`, data)
  },

  /**
   * Met à jour une faculté par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant de la faculté.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Faculté mise à jour.
   */
  patch(id, data) {
    return httpService.patch(`/faculties/${id}`, data)
  },

  /**
   * Supprime une faculté par ID.
   * @param {number|string} id - Identifiant de la faculté.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/faculties/${id}`)
  },

  /**
   * Récupère les départements d'une faculté donnée.
   * @param {number|string} facultyId - Identifiant de la faculté.
   * @returns {Promise<any>} Tableau de départements.
   */
  getDepartments(facultyId) {
    return httpService.get(`/faculties/${facultyId}/departments`)
  },
}