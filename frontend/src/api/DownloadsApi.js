import httpService from '../services/httpService'

export const DownloadsApi = {
  /**
   * Documents téléchargés par l'utilisateur connecté (plus récents d'abord).
   * @returns {Promise<any>} Collection de documents.
   */
  mine() {
    return httpService.get('/downloads/mine')
  },
}
