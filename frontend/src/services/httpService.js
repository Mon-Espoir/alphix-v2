/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Service HTTP générique
 * ---------------------------------------------------------------------------
 * Façade unique d'accès au réseau pour TOUTE l'application.
 * Encapsule exclusivement les 5 verbes HTTP (GET, POST, PUT, PATCH, DELETE)
 * au-dessus du client Axios (`api/client.js`).
 *
 * Contrat :
 *   - résout directement avec le corps de réponse (`response.data`) ;
 *   - rejette systématiquement avec une `ApiError` normalisée ;
 *   - NE CONTIENT AUCUNE connaissance des endpoints métier
 *     (aucun service Faculty / Document ici — ils vivront dans features/*).
 */

import apiClient from '../api/client'

/**
 * Service HTTP générique de l'application.
 */
class HttpService {
  /**
   * Requête GET.
   * @template T
   * @param {string} url - Chemin relatif au baseURL (ex. '/health').
   * @param {import('axios').AxiosRequestConfig} [config] - Options Axios additionnelles (params, signal...).
   * @returns {Promise<T>} Corps de la réponse déplié.
   */
  async get(url, config = {}) {
    const response = await apiClient.get(url, config)
    return response.data
  }

  /**
   * Requête POST (création de ressource).
   * @template T
   * @param {string} url - Chemin relatif au baseURL.
   * @param {unknown} [data] - Payload JSON ou FormData (upload de fichiers).
   * @param {import('axios').AxiosRequestConfig} [config] - Options Axios additionnelles.
   * @returns {Promise<T>} Corps de la réponse déplié.
   */
  async post(url, data = {}, config = {}) {
    const response = await apiClient.post(url, data, config)
    return response.data
  }

  /**
   * Requête PUT (remplacement complet d'une ressource).
   * @template T
   * @param {string} url - Chemin relatif au baseURL.
   * @param {unknown} [data] - Payload JSON complet.
   * @param {import('axios').AxiosRequestConfig} [config] - Options Axios additionnelles.
   * @returns {Promise<T>} Corps de la réponse déplié.
   */
  async put(url, data = {}, config = {}) {
    const response = await apiClient.put(url, data, config)
    return response.data
  }

  /**
   * Requête PATCH (mise à jour partielle d'une ressource).
   * @template T
   * @param {string} url - Chemin relatif au baseURL.
   * @param {unknown} [data] - Payload partiel JSON.
   * @param {import('axios').AxiosRequestConfig} [config] - Options Axios additionnelles.
   * @returns {Promise<T>} Corps de la réponse déplié.
   */
  async patch(url, data = {}, config = {}) {
    const response = await apiClient.patch(url, data, config)
    return response.data
  }

  /**
   * Requête DELETE (suppression d'une ressource).
   * Note : une réponse 204 résout avec `null` (corps vide), cas géré par l'appelant.
   * @template T
   * @param {string} url - Chemin relatif au baseURL.
   * @param {import('axios').AxiosRequestConfig} [config] - Options Axios additionnelles.
   * @returns {Promise<T>} Corps de la réponse déplié (souvent null en 204).
   */
  async delete(url, config = {}) {
    const response = await apiClient.delete(url, config)
    return response.data
  }
}

/** Instance unique partagée par toute l'application. */
export const httpService = new HttpService()

/** Classe exportée pour injection/testabilité sans état global. */
export { HttpService }

export default httpService
