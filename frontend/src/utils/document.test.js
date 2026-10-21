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
  buildDocSearchParams,
  resolveDocTypeSelection,
  applyClientFilters,
  applyDocLevelFilters,
  allowedDocTypesFor,
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
describe('resolveDocTypeSelection', () => {
  it('renvoie le type simple tel quel', () => {
    expect(resolveDocTypeSelection('exam')).toEqual({
      apiDocType: 'exam',
      docTypes: null,
      allowed: null,
    })
  })

  it('renvoie les types du groupe (filtre serveur via doc_types[])', () => {
    expect(resolveDocTypeSelection('tp_td')).toEqual({
      apiDocType: undefined,
      docTypes: ['tp', 'td'],
      allowed: ['tp', 'td'],
    })
    expect(resolveDocTypeSelection('syllabus_course').docTypes).toEqual(['syllabus', 'course'])
    expect(resolveDocTypeSelection('exam_correction').docTypes).toEqual(['exam', 'correction'])
  })

  it('reste neutre sans selection', () => {
    expect(resolveDocTypeSelection('')).toEqual({
      apiDocType: undefined,
      docTypes: null,
      allowed: null,
    })
    expect(resolveDocTypeSelection(undefined)).toEqual({
      apiDocType: undefined,
      docTypes: null,
      allowed: null,
    })
  })
})

describe('buildDocSearchParams', () => {
  it('mappe les filtres camelCase vers le contrat serveur', () => {
    const params = buildDocSearchParams({
      docType: 'exam',
      visibility: 'public',
      tagId: 3,
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      minDownloads: 5,
      minViews: 10,
      facultyId: 2,
      departmentId: 4,
      courseId: 7,
    })

    expect(params).toEqual({
      doc_type: 'exam',
      visibility: 'public',
      tag_id: 3,
      from_date: '2026-01-01',
      to_date: '2026-12-31',
      min_downloads: 5,
      min_views: 10,
      faculty_id: 2,
      department_id: 4,
      course_id: 7,
    })
  })

  it('omet les filtres vides et conserve les parametres additionnels', () => {
    const params = buildDocSearchParams(
      { docType: '', visibility: '', minDownloads: '', minViews: '' },
      { per_page: 50, query: 'chimie' },
    )

    expect(params).toEqual({ per_page: 50, query: 'chimie' })
  })

  it('n’envoie pas de doc_type invalide pour une puce groupe', () => {
    const params = buildDocSearchParams({ docType: 'tp_td' }, { per_page: 100 })

    expect(params.doc_type).toBeUndefined()
    expect(params.doc_types).toEqual(['tp', 'td'])
    expect(params.per_page).toBe(100)
  })

  it('transmet le niveau et le semestre', () => {
    const params = buildDocSearchParams({ levelId: 2, semesterId: 5 })

    expect(params).toEqual({ level_id: 2, semester_id: 5 })
  })
})

describe('allowedDocTypesFor', () => {
  it('renvoie le type simple seul', () => {
    expect(allowedDocTypesFor('exam')).toEqual(['exam'])
  })

  it('renvoie tous les types d’un groupe', () => {
    expect(allowedDocTypesFor('exam_correction')).toEqual(['exam', 'correction'])
    expect(allowedDocTypesFor('tp_td')).toEqual(['tp', 'td'])
  })

  it('renvoie null sans filtre', () => {
    expect(allowedDocTypesFor('')).toBeNull()
  })
})

describe('applyDocLevelFilters (filtre local par groupe)', () => {
  const docs = [
    { id: 1, doc_type: 'exam', downloads_count: 3, views_count: 3 },
    { id: 2, doc_type: 'correction', downloads_count: 3, views_count: 3 },
    { id: 3, doc_type: 'tp', downloads_count: 3, views_count: 3 },
  ]

  it('garde les deux types d’un groupe', () => {
    expect(applyDocLevelFilters(docs, { docType: 'exam_correction' }).map((d) => d.id)).toEqual([1, 2])
  })

  it('filtre sur un type simple', () => {
    expect(applyDocLevelFilters(docs, { docType: 'tp' }).map((d) => d.id)).toEqual([3])
  })
})
