/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Notification
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur les endpoints de notification du backend Laravel 13.
 * Endpoints authentifiés (auth:sanctum), préfixés par /notifications.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Notification — notifications utilisateur + marquage lu.
 */
export const NotificationApi = {
  /**
   * Envoie une notification d'upload à un utilisateur.
   * @param {number|string} userId - Identifiant de l'utilisateur destinataire.
   * @param {object} data - Données de la notification (document_id, message, etc.).
   * @returns {Promise<any>} Notification créée.
   */
  notifyUpload(userId, data) {
    return httpService.post(`/notifications/${userId}/upload`, data)
  },

  /**
   * Envoie une notification d'approbation à un utilisateur.
   * @param {number|string} userId - Identifiant de l'utilisateur destinataire.
   * @param {object} data - Données de la notification.
   * @returns {Promise<any>} Notification créée.
   */
  notifyApproval(userId, data) {
    return httpService.post(`/notifications/${userId}/approval`, data)
  },

  /**
   * Envoie une notification de rejet à un utilisateur.
   * @param {number|string} userId - Identifiant de l'utilisateur destinataire.
   * @param {object} data - Données de la notification.
   * @returns {Promise<any>} Notification créée.
   */
  notifyRejection(userId, data) {
    return httpService.post(`/notifications/${userId}/rejection`, data)
  },

  /**
   * Récupère les notifications d'un utilisateur.
   * @param {number|string} userId - Identifiant de l'utilisateur.
   * @param {object} [params] - Paramètres de query (page, per_page, read_status...).
   * @returns {Promise<any>} Réponse paginée de notifications.
   */
  getByUser(userId, params) {
    return httpService.get(`/notifications/user/${userId}`, { params })
  },

  /**
   * Récupère les notifications non lues d'un utilisateur.
   * @param {number|string} userId - Identifiant de l'utilisateur.
   * @returns {Promise<any>} Tableau de notifications non lues.
   */
  getUnreadByUser(userId) {
    return httpService.get(`/notifications/user/${userId}/unread`)
  },

  /**
   * Marque une notification comme lue.
   * @param {number|string} id - Identifiant de la notification.
   * @returns {Promise<any>} Notification mise à jour.
   */
  markAsRead(id) {
    return httpService.patch(`/notifications/${id}/read`)
  },

  /**
   * Diffuse un message personnalisé à tous les utilisateurs (admin).
   * @param {{title: string, body?: string, message?: string, type?: string}} payload
   * @returns {Promise<{message: string, count: number}>}
   */
  broadcast(payload) {
    return httpService.post('/notifications/broadcast', payload)
  },

  /**
   * Récupère les notifications de l'utilisateur connecté (via /me).
   * @returns {Promise<any>}
   */
  getMe(params) {
    return httpService.get('/notifications/me', { params })
  },

  /**
   * Récupère les notifications non lues de l'utilisateur connecté.
   * @returns {Promise<any>}
   */
  getMyUnread() {
    return httpService.get('/notifications/me/unread')
  },
}