/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — API User
 * ---------------------------------------------------------------------------
 * Couche d'abstraction HTTP sur le resource `users` du backend Laravel 13.
 * Inclut les endpoints de recherche par email, UUID et rôle.
 * Toutes les méthodes délèguent à `httpService` (service HTTP générique).
 * Aucune logique métier : transport uniquement.
 */

import httpService from '../services/httpService'

/**
 * API User — CRUD complet + endpoints de recherche spécialisés.
 */
export const UserApi = {
  /**
   * Récupère la liste paginée des utilisateurs.
   * @param {object} [params] - Paramètres de query (page, per_page, search, role...).
   * @returns {Promise<any>} Réponse paginée d'utilisateurs.
   */
  list(params) {
    return httpService.get('/users', { params })
  },

  /**
   * Récupère un utilisateur par son ID.
   * @param {number|string} id - Identifiant de l'utilisateur.
   * @returns {Promise<any>} Objet utilisateur.
   */
  get(id) {
    return httpService.get(`/users/${id}`)
  },

  /**
   * Crée un nouvel utilisateur.
   * @param {object} data - Données de l'utilisateur (name, email, password, role, etc.).
   * @returns {Promise<any>} Utilisateur créé.
   */
  create(data) {
    return httpService.post('/users', data)
  },

  /**
   * Met à jour un utilisateur par ID (remplacement complet).
   * @param {number|string} id - Identifiant de l'utilisateur.
   * @param {object} data - Nouvelles données de l'utilisateur.
   * @returns {Promise<any>} Utilisateur mis à jour.
   */
  update(id, data) {
    return httpService.put(`/users/${id}`, data)
  },

  /**
   * Met à jour un utilisateur par ID (mise à jour partielle).
   * @param {number|string} id - Identifiant de l'utilisateur.
   * @param {object} data - Données partielles à modifier.
   * @returns {Promise<any>} Utilisateur mis à jour.
   */
  patch(id, data) {
    return httpService.patch(`/users/${id}`, data)
  },

  /**
   * Supprime un utilisateur par ID.
   * @param {number|string} id - Identifiant de l'utilisateur.
   * @returns {Promise<any>} Réponse vide (status 204).
   */
  delete(id) {
    return httpService.delete(`/users/${id}`)
  },

  /**
   * Récupère un utilisateur par son email.
   * @param {string} email - Email de l'utilisateur.
   * @returns {Promise<any>} Objet utilisateur.
   */
  getByEmail(email) {
    return httpService.get(`/users/by-email/${email}`)
  },

  /**
   * Récupère un utilisateur par son UUID.
   * @param {string} uuid - UUID de l'utilisateur.
   * @returns {Promise<any>} Objet utilisateur.
   */
  getByUuid(uuid) {
    return httpService.get(`/users/by-uuid/${uuid}`)
  },

  /**
   * Récupère les utilisateurs par rôle.
   * @param {string} role - Rôle à filtrer (ex: 'admin', 'teacher', 'student').
   * @param {object} [params] - Paramètres de query additionnels.
   * @returns {Promise<any>} Tableau d'utilisateurs.
   */
  getByRole(role, params) {
    return httpService.get(`/users/by-role/${role}`, { params })
  },
}