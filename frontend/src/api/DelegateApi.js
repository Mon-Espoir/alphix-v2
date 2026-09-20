/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Delegate (Espace Délégué)
 * ---------------------------------------------------------------------------
 * Stats scopées, passation autonome par email, révocation admin.
 */

import httpService from '../services/httpService'

export const DelegateApi = {
  /**
   * Stats scopées au département du délégué.
   * @returns {Promise<any>} { department_id, totals, courses }.
   */
  stats() {
    return httpService.get('/delegate/stats')
  },

  /**
   * Passation : promeut le successeur (email, même département).
   * @param {string} email - Email du successeur.
   * @returns {Promise<any>}
   */
  handover(email) {
    return httpService.post('/delegate/handover', { email })
  },

  /**
   * Révocation admin : retire le rôle délégué.
   * @param {number|string} userId - Compte délégué à révoquer.
   * @returns {Promise<any>}
   */
  revoke(userId) {
    return httpService.post('/delegate/revoke', { user_id: userId })
  },

  /**
   * Nomination admin : promeut un compte au rôle délégué.
   * @param {{user_id?: number|string, email?: string, department_id?: number|string}} payload
   * @returns {Promise<any>}
   */
  promote(payload) {
    return httpService.post('/delegate/promote', payload)
  },

  /**
   * Étudiants de la promotion/classe du délégué (reset mot de passe).
   * @returns {Promise<any>} { data: [{ id, name, username, email, level_id }] }.
   */
  students() {
    return httpService.get('/delegate/students')
  },

  /**
   * Réinitialise le mot de passe d'un étudiant de la classe du délégué.
   * Peut recevoir un nouveau mot de passe (password + password_confirmation) ;
   * sinon le backend génère un mot de passe temporaire retourné une seule fois.
   * @param {number|string} userId - Identifiant de l'étudiant.
   * @param {{password?: string, password_confirmation?: string}} [data] - Nouveau mot de passe.
   * @returns {Promise<any>} { data: { email, username, temporary_password } }.
   */
  resetPassword(userId, data = {}) {
    return httpService.post(`/delegate/students/${userId}/reset-password`, data)
  },
}
