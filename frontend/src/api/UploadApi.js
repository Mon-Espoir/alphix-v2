/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Upload
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur les endpoints d'upload du backend Laravel 13.
 * Endpoints authentifiés (auth:sanctum), préfixés par /upload.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Upload — validation fichier + hash + détection MIME + détection doublons.
 */
export const UploadApi = {
  /**
   * Valide un fichier avant upload.
   * @param {object} data - Données du fichier (name, size, mime_type, etc.) ou FormData.
   * @param {object} [config] - Configuration Axios additionnelle.
   * @returns {Promise<any>} Résultat de validation.
   */
  validateFile(data, config) {
    return httpService.post('/upload/validate-file', data, config)
  },

  /**
   * Calcule le hash d'un fichier.
   * @param {object} data - Données du fichier (contenu ou référence).
   * @param {object} [config] - Configuration Axios additionnelle.
   * @returns {Promise<any>} Hash calculé.
   */
  computeHash(data, config) {
    return httpService.post('/upload/compute-hash', data, config)
  },

  /**
   * Détecte le type MIME d'un fichier.
   * @param {object} data - Données du fichier.
   * @param {object} [config] - Configuration Axios additionnelle.
   * @returns {Promise<any>} Type MIME détecté.
   */
  detectMimeType(data, config) {
    return httpService.post('/upload/detect-mime-type', data, config)
  },

  /**
   * Recherche un doublon par hash.
   * @param {string} hash - Hash du fichier à rechercher.
   * @returns {Promise<any>} Document existant si trouvé, null sinon.
   */
  findDuplicateByHash(hash) {
    return httpService.get(`/upload/duplicate-by-hash/${hash}`)
  },
}