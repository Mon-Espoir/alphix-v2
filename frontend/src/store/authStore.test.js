/**
 * Tests unitaires — Store d'authentification (Phase 3).
 * Vérifie login, register, logout, initializeAuth, refreshUser, clearAuth,
 * persistance du jeton et gestion 401, sans backend ni DOM.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AUTH_STATUS } from '../constants/auth'
import { removeToken, getToken } from '../utils/storage'

// --- Mock Axios : le client renvoie les fonctions du store mockées ---------
const h = vi.hoisted(() => {
  const fns = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
  return { fns }
})

vi.mock('axios', () => {
  const client = {
    interceptors: { request: { use: () => {} }, response: { use: () => {} } },
    get: (...a) => h.fns.get(...a),
    post: (...a) => h.fns.post(...a),
    put: (...a) => h.fns.put(...a),
    patch: (...a) => h.fns.patch(...a),
    delete: (...a) => h.fns.delete(...a),
  }
  return { default: { create: () => client }, create: () => client }
})

const { useAuthStore } = await import('../store/authStore')

const store = () => useAuthStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, token: null, status: AUTH_STATUS.IDLE, isLoading: false })
  removeToken()
})

describe('login()', () => {
  it('stocke le jeton, l’utilisateur et passe AUTHENTICATED', async () => {
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 1, email: 'a@b.c' } } })

    await store().login({ email: 'a@b.c', password: 'secret' })

    expect(store().status).toBe(AUTH_STATUS.AUTHENTICATED)
    expect(store().token).toBe('jwt-123')
    expect(store().user).toEqual({ id: 1, email: 'a@b.c' })
    expect(getToken()).toBe('jwt-123')
    expect(store().isLoading).toBe(false)
  })

  it('purge la session et relance l’erreur en cas d’échec', async () => {
    h.fns.post.mockRejectedValueOnce(new Error('invalid credentials'))

    await expect(store().login({ email: 'a@b.c', password: 'wrong' })).rejects.toBeDefined()

    expect(store().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(store().token).toBeNull()
    expect(store().user).toBeNull()
    expect(getToken()).toBeNull()
  })
})

describe('register()', () => {
  it('connecte automatiquement après inscription', async () => {
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-new', user: { id: 2, email: 'n@b.c' } } })

    await store().register({ name: 'New', email: 'n@b.c', password: 'secret' })

    expect(store().status).toBe(AUTH_STATUS.AUTHENTICATED)
    expect(store().token).toBe('jwt-new')
    expect(getToken()).toBe('jwt-new')
  })

  it('purge la session en cas d’échec (ex. email pris)', async () => {
    h.fns.post.mockRejectedValueOnce(new Error('email already taken'))

    await expect(store().register({ name: 'X', email: 'x@b.c', password: 's' })).rejects.toBeDefined()

    expect(store().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(getToken()).toBeNull()
  })
})

describe('logout()', () => {
  it('appelle /logout puis purge locale (token + état)', async () => {
    // Simule une session active.
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 1 } } })
    await store().login({ email: 'a@b.c', password: 's' })
    expect(getToken()).toBe('jwt-123')

    h.fns.post.mockResolvedValueOnce({ data: { message: 'ok' } })
    await store().logout()

    expect(store().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(store().token).toBeNull()
    expect(getToken()).toBeNull()
  })
})

describe('initializeAuth() — auto-login / restauration', () => {
  it('retourne false et reste UNAUTHENTICATED sans jeton (aucun appel réseau)', async () => {
    removeToken()
    const result = await store().initializeAuth()

    expect(result).toBe(false)
    expect(store().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(h.fns.get).not.toHaveBeenCalled()
  })

  it('restaure l’utilisateur depuis /me quand un jeton existe', async () => {
    // Pose un jeton (comme après un refresh navigateur).
    store().login // noop ref
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 1 } } })
    await store().login({ email: 'a@b.c', password: 's' })
    h.fns.get.mockResolvedValueOnce({ data: { user: { id: 1, name: 'Irakli' } } })

    const result = await store().initializeAuth()

    expect(result).toBe(true)
    expect(store().status).toBe(AUTH_STATUS.AUTHENTICATED)
    expect(store().user).toEqual({ id: 1, name: 'Irakli' })
    expect(h.fns.get).toHaveBeenCalledWith('/me', {})
  })

  it('purge tout si /me répond 401 (jeton expiré)', async () => {
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 1 } } })
    await store().login({ email: 'a@b.c', password: 's' })

    const err401 = { isAxiosError: true, response: { status: 401, data: {} }, config: {} }
    h.fns.get.mockRejectedValueOnce(err401)

    const result = await store().initializeAuth()

    expect(result).toBe(false)
    expect(store().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(store().token).toBeNull()
    expect(getToken()).toBeNull()
  })
})

describe('refreshUser()', () => {
  it('ré-harmonise le profil courant', async () => {
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 1 } } })
    await store().login({ email: 'a@b.c', password: 's' })
    h.fns.get.mockResolvedValueOnce({ data: { user: { id: 1, name: 'Updated' } } })

    const ok = await store().refreshUser()

    expect(ok).toBe(true)
    expect(store().user).toEqual({ id: 1, name: 'Updated' })
  })

  it('purge en cas de 401', async () => {
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 1 } } })
    await store().login({ email: 'a@b.c', password: 's' })
    h.fns.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401, data: {} }, config: {} })

    const ok = await store().refreshUser()

    expect(ok).toBe(false)
    expect(store().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(getToken()).toBeNull()
  })
})

describe('clearAuth()', () => {
  it('réinitialise état et supprime le jeton', async () => {
    h.fns.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 1 } } })
    await store().login({ email: 'a@b.c', password: 's' })
    expect(getToken()).toBe('jwt-123')

    store().clearAuth()

    expect(store().user).toBeNull()
    expect(store().token).toBeNull()
    expect(store().status).toBe(AUTH_STATUS.UNAUTHENTICATED)
    expect(getToken()).toBeNull()
  })
})
