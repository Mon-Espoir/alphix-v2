/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Document
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `documents` du backend Laravel 13.
 * Inclut les endpoints publics (featured, increment view/download) et CRUD authentifié.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Document — CRUD complet + endpoints publics + compteurs.
 */
export const DocumentApi = {
  /**
   * Récupère la liste paginée des documents (authentifié).
   * @param {object} [params] - Paramètres de query (page, per_page, filters...).
   * @returns {Promise<any>} Réponse paginée de documents.
   */
  list(params) {
    return httpService.get('/documents', { params })
  },

  /**
   * Récupère un document par son ID (authentifié).
   * @param {number|string} id - Identifiant du document.
   * @returns {Promise<any>} Objet document.
   */
  get(id) {
    return httpService.get(`/documents/${id}`)
  },

  /**
   * Crée un nouveau document (authentifié).
   * @param {object|FormData} data - Données du document (title, description, file, course_id, tags, etc.).
   * @param {object} [config] - Configuration Axios additionnelle (ex: headers pour FormData).
   * @returns {Promise<any>} Document créé.
   */
  create(data, config) {
    return httpService.post('/documents', data, config)
  },

  /**
   * Met à jour un document par ID (remplacement complet, authentifié).
   * @param {number|string} id - Identifiant du document.
   * @param {object} data - Nouvelles données du document.
   * @returns {Promise<any>} Document mis à jour.
   */
  update(id, data) {
    return httpService.put(`/documents/${id}`, data)
  },

  /**
   * Met à jour un document par ID (mise à jour partielle, authentifié).
   * @param {number|string} id - Identifiant du document.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Document mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/documents/${id}`, data)
  },

  /**
   * Supprime un document par ID (authentifié).
   * @param {number|string} id - Identifiant du document.
   * @returns {Promise<any>} Document supprimé.
   */
  delete(id) {
    return httpService.delete(`/documents/${id}`)
  },

  /**
   * Classification manuelle d'un document en attente (fallback upload).
   * Rattache le cours + le type choisis par l'étudiant (PATCH /documents/{id}/classify).
   * @param {number|string} id - Identifiant du document.
   * @param {{course_id: number, doc_type: string}} payload - Cours et type sélectionnés.
   * @returns {Promise<any>} Document classifié.
   */
  classify(id, payload) {
    return httpService.patch(`/documents/${id}/classify`, payload)
  },

  /**
   * Récupère les documents mis en avant (public).
   * @param {object} [params] - Paramètres de query (limit, etc.).
   * @returns {Promise<any>} Tableau de documents mis en avant.
   */
  getFeatured(params) {
    return httpService.get('/documents/featured', { params })
  },

  /**
   * Incrémente le compteur de vues d'un document (public).
   * @param {number|string} id - Identifiant du document.
   * @returns {Promise<any>} Réponse de confirmation.
   */
  incrementView(id) {
    return httpService.post(`/documents/${id}/view`)
  },

  /**
   * Incrémente le compteur de téléchargements d'un document (public).
   * @param {number|string} id - Identifiant du document.
   * @returns {Promise<any>} Réponse de confirmation.
   */
  incrementDownload(id) {
    return httpService.post(`/documents/${id}/download`)
  },

  /**
   * Récupère les tags d'un document donné.
   * @param {number|string} documentId - Identifiant du document.
   * @returns {Promise<any>} Tableau de tags.
   */
  getTags(documentId) {
    return httpService.get(`/documents/${documentId}/tags`)
  },
}