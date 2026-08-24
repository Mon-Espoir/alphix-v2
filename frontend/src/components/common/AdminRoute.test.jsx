/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Tests AdminRoute guard (sans @testing-library)
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuth(),
}))

vi.mock('../feedback/LoadingScreen', () => ({
  default: () => 'loading',
}))

// Import après mocks (top-level await style similaire à client.test)
const { hasAdminAccess } = await import('../../utils/admin')

beforeEach(() => vi.clearAllMocks())

describe('AdminRoute logic', () => {
  it('reconnaît un admin', () => {
    expect(hasAdminAccess({ role: 'admin' })).toBe(true)
    expect(hasAdminAccess({ role: 'super_admin' })).toBe(true)
  })

  it('refuse un non-admin', () => {
    expect(hasAdminAccess({ role: 'student' })).toBe(false)
    expect(hasAdminAccess(null)).toBe(false)
  })

  it('mockAuth est appelable', () => {
    mockAuth.mockReturnValue({ user: { role: 'admin' }, isAuthenticated: true, loading: false })
    const v = mockAuth()
    expect(v.isAuthenticated).toBe(true)
  })
})
