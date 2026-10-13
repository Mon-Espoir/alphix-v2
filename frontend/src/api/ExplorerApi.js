/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API Explorer (cascade intelligente)
 * ---------------------------------------------------------------------------
 * Une seule requete construit tout l'arbre Faculte -> Departement ->
 * Classe -> Cours (branches vides elaguees). Transport uniquement.
 */

import httpService from '../services/httpService'

export const ExplorerApi = {
  /**
   * Recupere l'arbre complet de navigation (public, 1 appel).
   * @returns {Promise<any>} { data: [facultes...] }
   */
  tree() {
    return httpService.get('/explorer')
  },
}
