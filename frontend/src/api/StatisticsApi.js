/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Statistics
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur les endpoints de statistiques du backend Laravel 13.
 * Endpoints authentifiés (auth:sanctum).
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Statistics — mise à jour popularité + recalcul global.
 */
export const StatisticsApi = {
  /**
   * Met à jour la popularité d'un document.
   * @param {number|string} documentId - Identifiant du document.
   * @param {object} data - Données de mise à jour (views, downloads, etc.).
   * @returns {Promise<any>} Statistiques mises à jour.
   */
  updatePopularity(documentId, data) {
    return httpService.post(`/statistics/${documentId}/popularity`, data)
  },

  /**
   * Déclenche le recalcul global des statistiques.
   * @returns {Promise<any>} Résultat du recalcul.
   */
  recalculate() {
    return httpService.post('/statistics/recalculate')
  },
}