/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Tests Administration utils
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from 'vitest'
import {
  isAdminRole,
  hasAdminAccess,
  computeUserStats,
  computeDocumentStats,
  computeStorageStats,
  computeEntityStats,
  buildAdminDashboardStats,
  filterUsers,
  filterDocuments,
  paginate,
  groupDocumentsByFaculty,
  groupDocumentsByDepartment,
  buildDailyUploadSeries,
  filterLogs,
  buildUserGrowthSeries,
  findMissingDocuments,
  toDayKey,
} from './admin'

describe('admin utils — isAdminRole / hasAdminAccess', () => {
  it('reconnaît les rôles admin exacts', () => {
    expect(isAdminRole('admin')).toBe(true)
    expect(isAdminRole('super_admin')).toBe(true)
    expect(isAdminRole('superadmin')).toBe(true)
    expect(isAdminRole('ADMIN')).toBe(true)
  })
  it('rejette les rôles non-admin', () => {
    expect(isAdminRole('student')).toBe(false)
    expect(isAdminRole('')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
  })
  it('hasAdminAccess tolère role et roles[]', () => {
    expect(hasAdminAccess({ role: 'admin' })).toBe(true)
    expect(hasAdminAccess({ roles: ['student', 'admin'] })).toBe(true)
    expect(hasAdminAccess({ role: 'student' })).toBe(false)
    expect(hasAdminAccess(null)).toBe(false)
  })
})

describe('computeUserStats', () => {
  it('compte total / actifs / en ligne', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const users = [
      { id: 1, status: true, last_activity_at: '2026-01-10T11:58:00Z' },
      { id: 2, status: false, last_activity_at: '2026-01-10T11:00:00Z' },
      { id: 3, status: 1, last_activity_at: '2026-01-10T11:59:30Z' },
    ]
    const s = computeUserStats(users, now)
    expect(s.total).toBe(3)
    expect(s.active).toBe(2)
    expect(s.online).toBe(2)
  })
})

describe('computeDocumentStats', () => {
  it('agrège upload today / pending / failed', () => {
    const now = new Date('2026-01-10T15:00:00Z')
    const docs = [
      { id: 1, status: 'pending', created_at: '2026-01-10T10:00:00Z' },
      { id: 2, status: 'approved', created_at: '2026-01-09T10:00:00Z' },
      { id: 3, status: 'failed', created_at: '2026-01-10T08:00:00Z' },
    ]
    const s = computeDocumentStats(docs, now)
    expect(s.total).toBe(3)
    expect(s.pending).toBe(1)
    expect(s.failed).toBe(1)
    expect(s.uploadedToday).toBe(2)
  })
})

describe('computeStorageStats', () => {
  it('calcule usage agrégé', () => {
    const drives = [
      { status: true, storage_limit: 1000, used_storage: 400 },
      { status: false, storage_limit: 2000, used_storage: 600 },
    ]
    const s = computeStorageStats(drives)
    expect(s.activeCount).toBe(1)
    expect(s.totalLimit).toBe(3000)
    expect(s.totalUsed).toBe(1000)
    expect(s.usagePercent).toBe(33)
  })
  it('retourne null sans limite', () => {
    expect(computeStorageStats([{ status: true }]).usagePercent).toBeNull()
  })
})

describe('computeEntityStats', () => {
  it('retourne total et actifs', () => {
    expect(computeEntityStats([{ status: true }, { status: false }])).toEqual({ total: 2, active: 1 })
  })
})

describe('buildAdminDashboardStats', () => {
  it('produit les 15 KPIs', () => {
    const s = buildAdminDashboardStats({ users: [], documents: [], faculties: [], departments: [], courses: [], drives: [] })
    expect(s.totalUsers).toBe(0)
    expect(s.serverHealth).toBe('healthy')
    expect(s.appVersion).toBe('2.0.0')
  })
})

describe('filterUsers / filterDocuments / filterLogs', () => {
  it('filtre par requête', () => {
    const users = [{ name: 'Alice', email: 'alice@test.io', role: 'admin', status: true }]
    expect(filterUsers(users, { query: 'alice' })).toHaveLength(1)
    expect(filterUsers(users, { query: 'bob' })).toHaveLength(0)
  })
  it('filtre documents par statut', () => {
    const docs = [{ title: 'Doc A', status: 'pending' }, { title: 'Doc B', status: 'approved' }]
    expect(filterDocuments(docs, { status: 'pending' })).toHaveLength(1)
  })
  it('filtre logs par niveau', () => {
    const logs = [{ message: 'boom', level: 'error' }, { message: 'ok', level: 'info' }]
    expect(filterLogs(logs, { level: 'error' })).toHaveLength(1)
    expect(filterLogs(logs, { query: 'boom' })).toHaveLength(1)
  })
})

describe('paginate', () => {
  it('découpe correctement', () => {
    const items = [1, 2, 3, 4, 5]
    const p = paginate(items, 2, 2)
    expect(p.items).toEqual([3, 4])
    expect(p.totalPages).toBe(3)
  })
})

describe('groupDocuments', () => {
  it('groupe par faculté', () => {
    const docs = [{ faculty_id: 1, faculty: { name: 'Sciences' } }, { faculty_id: 1 }, { faculty_id: 2 }]
    const g = groupDocumentsByFaculty(docs)
    expect(g[0].count).toBe(2)
  })
  it('groupe par département', () => {
    const docs = [{ department_id: 5 }, { department_id: 5 }, { department_id: 9 }]
    expect(groupDocumentsByDepartment(docs)[0].count).toBe(2)
  })
})

describe('buildDailyUploadSeries', () => {
  it('produit N points ordonnés', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const docs = [{ created_at: '2026-01-10T08:00:00Z' }, { created_at: '2026-01-09T08:00:00Z' }]
    const s = buildDailyUploadSeries(docs, 2, now)
    expect(s).toHaveLength(2)
    expect(s[1].count).toBe(1)
  })
})

describe('buildUserGrowthSeries', () => {
  it('calcule cumulatif', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const users = [{ created_at: '2026-01-09T10:00:00Z' }, { created_at: '2026-01-10T10:00:00Z' }]
    const g = buildUserGrowthSeries(users, 2, now)
    expect(g[1].cumulative).toBe(2)
  })
})

describe('findMissingDocuments', () => {
  it('détecte cours sans doc récent', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const courses = [{ id: 1, name: 'Math' }, { id: 2, name: 'Phys' }]
    const docs = [{ course_id: 1, created_at: '2026-01-10T10:00:00Z' }]
    const m = findMissingDocuments(courses, docs, now)
    expect(m.some((x) => x.course.id === 2)).toBe(true)
  })
})

describe('toDayKey', () => {
  it('normalise les dates', () => {
    expect(toDayKey('2026-01-10T12:00:00Z')).toBe('2026-01-10')
    expect(toDayKey(null)).toBeNull()
  })
})
