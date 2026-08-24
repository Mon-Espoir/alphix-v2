/**
 * Tests unitaires — Interceptor Axios : déconnexion globale sur 401.
 * Vérifie que seul un 401 portant un jeton déclenche l'évènement
 * `auth:unauthorized` (qui pilotera la redirection vers /login), et qu'un
 * 403 ne déclenche JAMAIS de déconnexion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock du storage pour piloter getToken().
vi.mock('../utils/storage', () => ({
  getToken: vi.fn(() => 'valid-token'),
  setToken: vi.fn(),
  removeToken: vi.fn(),
}))

// Capture le gestionnaire d'erreur de l'interceptor response.
let responseErrorHandler
const fakeClient = {
  interceptors: {
    request: { use: () => {} },
    response: { use: (_ok, err) => { responseErrorHandler = err } },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

vi.mock('axios', () => ({
  default: { create: () => fakeClient },
  create: () => fakeClient,
}))

// Fenêtre factice avec spy de dispatchEvent (évite jsdom).
globalThis.window = { dispatchEvent: vi.fn() }

const { apiClient } = await import('../api/client')
const { getToken } = await import('../utils/storage')

beforeEach(() => {
  globalThis.window.dispatchEvent.mockClear()
  getToken.mockReturnValue('valid-token')
})

const fire = async (status) => {
  const error = { isAxiosError: true, response: { status, data: {} }, config: { url: '/x' } }
  try {
    await responseErrorHandler(error)
  } catch {
    /* l'interceptor renvoie une promesse rejetée — ignorée ici */
  }
}

describe('interceptor 401', () => {
  it('émet auth:unauthorized sur 401 avec jeton', async () => {
    await fire(401)

    expect(globalThis.window.dispatchEvent).toHaveBeenCalledTimes(1)
    const evt = globalThis.window.dispatchEvent.mock.calls[0][0]
    expect(evt).toBeInstanceOf(CustomEvent)
    expect(evt.type).toBe('auth:unauthorized')
  })

  it('n’émet RIEN sur 401 sans jeton (login/register)', async () => {
    getToken.mockReturnValue(null)
    await fire(401)

    expect(globalThis.window.dispatchEvent).not.toHaveBeenCalled()
  })

  it('n’émet RIEN sur 403 (accès refusé — pas de déconnexion)', async () => {
    await fire(403)

    expect(globalThis.window.dispatchEvent).not.toHaveBeenCalled()
  })

  it('n’émet RIEN sur 500 (erreur serveur)', async () => {
    await fire(500)

    expect(globalThis.window.dispatchEvent).not.toHaveBeenCalled()
  })
})

// S'assure que l'interceptor a bien été enregistré.
it('interceptor response enregistré', () => {
  expect(typeof responseErrorHandler).toBe('function')
  expect(apiClient).toBeDefined()
})
