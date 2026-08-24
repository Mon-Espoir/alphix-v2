/**
 * ALPHIX V2 — Tests des helpers du module Documents.
 */

import { describe, expect, it } from 'vitest'
import {
  docTypeLabel,
  docStatusMeta,
  formatFileSize,
  formatShortDate,
  buildSearchParams,
  applyClientFilters,
  sortDocuments,
  documentTitle,
} from './document'

describe('libelles documents', () => {
  it('resout les libelles de type et statut', () => {
    expect(docTypeLabel('exam')).toBe('Examen')
    expect(docTypeLabel('inconnu')).toBe('inconnu')
    const status = docStatusMeta('approved')
    expect(status.label).toBe('Approuve')
    expect(status.badge).toBe('primary')
  })
})

describe('formatFileSize', () => {
  it('formate les tailles en unites lisibles', () => {
    expect(formatFileSize(512)).toBe('512 o')
    expect(formatFileSize(2048)).toBe('2.0 Ko')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 Mo')
    expect(formatFileSize(null)).toBe('-')
  })
})

describe('formatShortDate', () => {
  it('retourne un tiret pour une valeur absente', () => {
    expect(formatShortDate(null)).toBe('-')
    expect(formatShortDate('pas-une-date')).toBe('-')
  })
  it('formate une date ISO valide', () => {
    expect(formatShortDate('2026-01-15T10:00:00Z')).toMatch(/2026/)
  })
})

describe('buildSearchParams', () => {
  it('ne transmet que les parametres renseignes + per_page', () => {
    const params = buildSearchParams({
      query: '  chimie ',
      facultyId: 3,
      departmentId: '',
      docType: 'exam',
      sort: 'downloads',
    })
    expect(params).toEqual({
      query: 'chimie',
      faculty_id: 3,
      doc_type: 'exam',
      sort: 'downloads',
      per_page: 100,
    })
  })

  it('exige toujours per_page meme sans filtres', () => {
    expect(buildSearchParams({})).toEqual({ per_page: 100 })
  })
})

describe('applyClientFilters', () => {
  const docs = [
    {
      id: 1,
      created_at: '2026-01-10T00:00:00Z',
      downloads_count: 12,
      views_count: 40,
      course: { id: 7, level: { id: 2 }, semester: { id: 3 } },
      tags: [{ id: 9 }],
    },
    {
      id: 2,
      created_at: '2025-06-02T00:00:00Z',
      downloads_count: 0,
      views_count: 1,
      course: { id: 8, level: { id: 1 }, semester: { id: 4 } },
      tags: [],
    },
  ]

  it('combine niveau, semestre, cours, tag, dates et compteurs', () => {
    expect(applyClientFilters(docs, { levelId: 2 })).toHaveLength(1)
    expect(applyClientFilters(docs, { courseId: 7, tagId: 9 })).toHaveLength(1)
    expect(applyClientFilters(docs, { fromDate: '2026-01-01' })).toHaveLength(1)
    expect(applyClientFilters(docs, { minDownloads: 5, minViews: 10 })).toHaveLength(1)
    expect(applyClientFilters(docs, {})).toHaveLength(2)
  })

  it('exclut tout quand aucune facette ne correspond', () => {
    expect(applyClientFilters(docs, { levelId: 99 })).toHaveLength(0)
  })
})

describe('sortDocuments', () => {
  const docs = [
    { title: 'Zeta', downloads_count: 3, created_at: '2025-01-01' },
    { title: 'Alpha', downloads_count: 9, created_at: '2026-05-05' },
  ]
  it('trie alphabetiquement (asc par defaut)', () => {
    expect(sortDocuments(docs, 'alpha').map((d) => d.title)).toEqual(['Alpha', 'Zeta'])
  })
  it('trie les telechargements (desc) et les plus recents', () => {
    expect(sortDocuments(docs, 'downloads')[0].downloads_count).toBe(9)
    expect(sortDocuments(docs, 'newest')[0].created_at).toBe('2026-05-05')
  })
  it('ne mute pas la liste source', () => {
    const copy = [...docs]
    sortDocuments(docs, 'alpha')
    expect(docs).toEqual(copy)
  })
})

describe('documentTitle', () => {
  it('retombe proprement sur un tiret', () => {
    expect(documentTitle({ title: 'Cours' })).toBe('Cours')
    expect(documentTitle(null)).toBe('-')
  })
})