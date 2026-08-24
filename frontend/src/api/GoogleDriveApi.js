/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API GoogleDrive
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `google-drives` du backend Laravel 13.
 * Inclut les endpoints pour le drive par défaut et les drives actifs par priorité.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API GoogleDrive — CRUD complet + endpoints spécialisés.
 */
export const GoogleDriveApi = {
  /**
   * Récupère la liste paginée des drives Google.
   * @param {object} [params] - Paramètres de query (page, per_page, search...).
   * @returns {Promise<any>} Réponse paginée de drives.
   */
  list(params) {
    return httpService.get('/google-drives', { params })
  },

  /**
   * Récupère un drive Google par son ID.
   * @param {number|string} id - Identifiant du drive.
   * @returns {Promise<any>} Objet drive.
   */
  get(id) {
    return httpService.get(`/google-drives/${id}`)
  },

  /**
   * Crée un nouveau drive Google.
   * @param {object} data - Données du drive (name, folder_id, credentials, priority, is_active, etc.).
   * @returns {Promise<any>} Drive créé.
   */
  create(data) {
    return httpService.post('/google-drives', data)
  },

  /**
   * Met à jour un drive Google par ID (remplacement complet).
   * @param {number|string} id - Identifiant du drive.
   * @param {object} data - Nouvelles données du drive.
   * @returns {Promise<any>} Drive mis à jour.
   */
  update(id, data) {
    return httpService.put(`/google-drives/${id}`, data)
  },

  /**
   * Met à jour un drive Google par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant du drive.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Drive mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/google-drives/${id}`, data)
  },

  /**
   * Supprime un drive Google par ID.
   * @param {number|string} id - Identifiant du drive.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/google-drives/${id}`)
  },

  /**
   * Récupère le drive Google par défaut.
   * @returns {Promise<any>} Objet drive par défaut.
   */
  getDefault() {
    return httpService.get('/google-drives/default')
  },

  /**
   * Récupère les drives Google actifs ordonnés par priorité.
   * @returns {Promise<any>} Tableau de drives actifs triés par priorité.
   */
  getActiveByPriority() {
    return httpService.get('/google-drives/active-by-priority')
  },
}