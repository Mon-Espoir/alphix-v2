/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Tests Automation utils (pure)
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from 'vitest'
import {
  extractMetadataFromFilename,
  suggestFaculty,
  suggestCourse,
  buildSuggestions,
  validateConstraints,
  selectBestDrive,
  detectImbalancedDrives,
  driveConnectivityStatus,
  dailyUploads,
  docsByFaculty,
  missingDocuments,
  verifyIntegrity,
  cleanupCandidates,
} from './automation'

describe('extractMetadataFromFilename', () => {
  it('extrait code et type', () => {
    const m = extractMetadataFromFilename('MATH101_exam_2023.pdf')
    expect(m.courseCode).toBe('MATH101')
    expect(m.docType).toBe('exam')
    expect(m.year).toBe(2023)
  })
  it('retourne tokens vides si vide', () => {
    const m = extractMetadataFromFilename('')
    expect(m.tokens).toEqual([])
  })
})

describe('suggestFaculty / suggestCourse / buildSuggestions', () => {
  it('suggère faculté par code', () => {
    const faculties = [{ id: 1, code: 'FIS', name: 'Faculté Sciences' }]
    const meta = { tokens: ['fis'], courseCode: null }
    const { faculty, confidence } = suggestFaculty(faculties, meta)
    expect(faculty.id).toBe(1)
    expect(confidence).toBeGreaterThan(0)
  })
  it('buildSuggestions calcule confiance et needsConfirmation', () => {
    const ctx = { faculties: [], departments: [], courses: [], semesters: [] }
    const meta = extractMetadataFromFilename('unknown_file.pdf')
    const r = buildSuggestions(ctx, meta)
    expect(r.confidence).toBeGreaterThanOrEqual(0)
    expect(typeof r.needsConfirmation).toBe('boolean')
  })
  it('suggestCourse exact code', () => {
    const courses = [{ id: 5, code: 'MATH101', name: 'Math' }]
    const meta = { courseCode: 'MATH101', tokens: ['math101'] }
    const { course, confidence } = suggestCourse(courses, meta, null)
    expect(course.id).toBe(5)
    expect(confidence).toBe(0.95)
  })
})

describe('validateConstraints', () => {
  it('valide MIME et taille (limite 50 Mo)', () => {
    expect(validateConstraints({ size: 1000, type: 'application/pdf' }).valid).toBe(true)
    expect(validateConstraints({ size: 1000, type: 'text/plain' }).valid).toBe(false)
    expect(validateConstraints({ size: 30 * 1024 * 1024, type: 'application/pdf' }).valid).toBe(true)
    expect(validateConstraints({ size: 60 * 1024 * 1024, type: 'application/pdf' }).valid).toBe(false)
  })
})

describe('selectBestDrive / detectImbalancedDrives', () => {
  it('choisit drive sain prioritaire', () => {
    const drives = [
      { id: 1, status: true, health_status: 'healthy', priority: 2, available_storage: 500 },
      { id: 2, status: true, health_status: 'healthy', priority: 1, available_storage: 100 },
    ]
    expect(selectBestDrive(drives).id).toBe(2)
  })
  it('detecte déséquilibre >80%', () => {
    const drives = [{ storage_limit: 1000, used_storage: 900 }, { storage_limit: 1000, used_storage: 100 }]
    expect(detectImbalancedDrives(drives)).toHaveLength(1)
  })
})

describe('driveConnectivityStatus', () => {
  it('healthy si récent', () => {
    const now = Date.now()
    const d = { health_status: 'healthy' }
    expect(driveConnectivityStatus(d, now - 1000, now)).toBe('healthy')
  })
  it('offline si critical', () => {
    expect(driveConnectivityStatus({ health_status: 'critical' }, Date.now())).toBe('offline')
  })
})

describe('dailyUploads / docsByFaculty / missingDocuments', () => {
  it('dailyUploads compte par jour', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const docs = [{ created_at: '2026-01-10T10:00:00Z' }, { created_at: '2026-01-09T10:00:00Z' }]
    const r = dailyUploads(docs, 2, now)
    expect(r).toHaveLength(2)
    expect(r[1].count).toBe(1)
  })
  it('docsByFaculty groupe', () => {
    const docs = [{ faculty_id: 1 }, { faculty_id: 1 }, { faculty_id: 2 }]
    expect(docsByFaculty(docs)[0].count).toBe(2)
  })
  it('missingDocuments détecte cours sans doc recent', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const courses = [{ id: 1, name: 'Math' }, { id: 2, name: 'Phys' }]
    const docs = [{ course_id: 1, created_at: '2026-01-10T10:00:00Z' }]
    const m = missingDocuments(courses, docs, 30, now)
    expect(m.some((c) => c.id === 2)).toBe(true)
  })
})

describe('verifyIntegrity / cleanupCandidates', () => {
  it('détecte drive manquant', () => {
    const drives = [{ id: 1 }]
    const docs = [{ id: 10, google_drive_id: 99 }]
    const { broken } = verifyIntegrity(docs, drives)
    expect(broken).toHaveLength(1)
  })
  it('cleanupCandidates filtre failed old', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    const docs = [
      { id: 1, status: 'failed', created_at: '2026-01-01T10:00:00Z' },
      { id: 2, status: 'approved', created_at: '2026-01-01T10:00:00Z' },
    ]
    expect(cleanupCandidates(docs, now)).toHaveLength(1)
  })
})
