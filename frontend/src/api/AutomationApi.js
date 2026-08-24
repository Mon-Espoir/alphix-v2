/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Automation
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur les endpoints d'automatisation du backend Laravel 13.
 * Endpoints authentifiés (auth:sanctum), préfixés par /automation.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API Automation — synchronisation drives + traitement documents + résolution drive cible.
 */
export const AutomationApi = {
  /**
   * Synchronise un drive Google donné.
   * @param {number|string} driveId - Identifiant du drive Google.
   * @returns {Promise<any>} Résultat de la synchronisation.
   */
  synchronizeDrive(driveId) {
    return httpService.post(`/automation/${driveId}/sync`)
  },

  /**
   * Traite les documents en attente (pipeline d'automatisation).
   * @returns {Promise<any>} Résultat du traitement.
   */
  processPendingDocuments() {
    return httpService.post('/automation/process-pending')
  },

  /**
   * Résout le drive cible pour l'automatisation.
   * @returns {Promise<any>} Drive cible résolu.
   */
  resolveTargetDrive() {
    return httpService.get('/automation/target-drive')
  },
}