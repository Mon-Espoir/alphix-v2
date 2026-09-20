/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Secondary AI (admin)
 * ---------------------------------------------------------------------------
 * Statut + mise à jour du toggle ON/OFF et de la clé API.
 * Endpoints authentifiés (admin via AdminRoute côté frontend).
 */

import httpService from '../services/httpService'

export const SecondaryAIApi = {
  /**
   * Statut courant : { enabled, configured, model, status, checked_at }.
   * @returns {Promise<any>}
   */
  status() {
    return httpService.get('/secondary-ai/status')
  },

  /**
   * Mise à jour : { enabled?: boolean, api_key?: string, model?: string }.
   * @param {object} data
   * @returns {Promise<any>}
   */
  update(data) {
    return httpService.put('/secondary-ai/settings', data)
  },
}
