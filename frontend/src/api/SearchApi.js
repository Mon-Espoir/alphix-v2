/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Search
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur les endpoints de recherche du backend Laravel 13.
 * Endpoints publics (non authentifiés).
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Search — recherche documents + requêtes populaires.
 */
export const SearchApi = {
  /**
   * Effectue une recherche de documents.
   * @param {object} params - Paramètres de recherche (q, filters, page, per_page, etc.).
   * @returns {Promise<any>} Résultats de recherche paginés.
   */
  search(params) {
    return httpService.get('/search', { params })
  },

  /**
   * Récupère les requêtes de recherche populaires.
   * @param {object} [params] - Paramètres optionnels (limit, etc.).
   * @returns {Promise<any>} Tableau de requêtes populaires.
   */
  getPopularQueries(params) {
    return httpService.get('/search/popular', { params })
  },
}