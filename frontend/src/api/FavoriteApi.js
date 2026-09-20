import httpService from '../services/httpService'

export const FavoriteApi = {
  list() {
    return httpService.get('/favorites')
  },
  add(documentId) {
    return httpService.post(`/favorites/${documentId}`)
  },
  remove(documentId) {
    return httpService.delete(`/favorites/${documentId}`)
  },
  check(documentId) {
    return httpService.get(`/favorites/${documentId}/check`)
  },
}
