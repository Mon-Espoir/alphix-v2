/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Document Tag
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `document-tags` du backend Laravel 13
 * et le point de liaison `document-tags/by-slug/{slug}` + `documents/{document}/tags`.
 */

import httpService from '../services/httpService'

/**
 * API Document Tag — étiquetage de documents.
 */
export const DocumentTagApi = {
  /**
   * Récupère la liste de tous les tags de documents.
   * @returns {Promise<any>} Tableau d'objets tag.
   */
  list() {
    return httpService.get('/document-tags')
  },

  /**
   * Récupère un tag de document par son ID.
   * @param {number|string} id - Identifiant du tag.
   * @returns {Promise<any>} Objet tag.
   */
  get(id) {
    return httpService.get(`/document-tags/${id}`)
  },

  /**
   * Crée un nouveau tag de document.
   * @param {object} data - Données du tag (name, color, etc.).
   * @returns {Promise<any>} Tag créé.
   */
  create(data) {
    return httpService.post('/document-tags', data)
  },

  /**
   * Met à jour un tag de document par ID (remplacement complet).
   * @param {number|string} id - Identifiant du tag.
   * @param {object} data - Nouvelles données du tag.
   * @returns {Promise<any>} Tag mis à jour.
   */
  update(id, data) {
    return httpService.put(`/document-tags/${id}`, data)
  },

  /**
   * Met à jour un tag de document par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant du tag.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Tag mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/document-tags/${id}`, data)
  },

  /**
   * Supprime un tag de document par ID.
   * @param {number|string} id - Identifiant du tag.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/document-tags/${id}`)
  },

  /**
   * Récupère un tag de document par son slug.
   * @param {string} slug - Slug du tag.
   * @returns {Promise<any>} Objet tag.
   */
  getBySlug(slug) {
    return httpService.get(`/document-tags/by-slug/${slug}`)
  },

  /**
   * Récupère les tags associés à un document donné.
   * @param {number|string} documentId - Identifiant du document.
   * @returns {Promise<any>} Tableau de tags.
   */
  getByDocument(documentId) {
    return httpService.get(`/documents/${documentId}/tags`)
  },
}