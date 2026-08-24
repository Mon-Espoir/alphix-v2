/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Level
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `levels` du backend Laravel 13.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Level — opérateurs CRUD + endpoint spécialisé.
 */
export const LevelApi = {
  /**
   * Récupère la liste de tous les niveaux.
   * @returns {Promise<any>} Tableau d'objets niveau.
   */
  list() {
    return httpService.get('/levels')
  },

  /**
   * Récupère un niveau par son ID.
   * @param {number|string} id - Identifiant du niveau.
   * @returns {Promise<any>} Objet niveau.
   */
  get(id) {
    return httpService.get(`/levels/${id}`)
  },

  /**
   * Crée un nouveau niveau.
   * @param {object} data - Données du niveau (name, code, order, is_active, etc.).
   * @returns {Promise<any>} Niveau créé.
   */
  create(data) {
    return httpService.post('/levels', data)
  },

  /**
   * Met à jour un niveau par ID (remplacement complet).
   * @param {number|string} id - Identifiant du niveau.
   * @param {object} data - Nouvelles données du niveau.
   * @returns {Promise<any>} Niveau mis à jour.
   */
  update(id, data) {
    return httpService.put(`/levels/${id}`, data)
  },

  /**
   * Met à jour un niveau par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant du niveau.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Niveau mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/levels/${id}`, data)
  },

  /**
   * Supprime un niveau par ID.
   * @param {number|string} id - Identifiant du niveau.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/levels/${id}`)
  },

  /**
   * Récupère les niveaux actifs ordonnés.
   * @returns {Promise<any>} Tableau de niveaux actifs triés.
   */
  getActiveOrdered() {
    return httpService.get('/levels/active-ordered')
  },
}