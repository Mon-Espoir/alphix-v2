/**
 * ALPHIX V2 — Tests TeacherBadge (enseignant titulaire + profil UB).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}))

vi.mock('../../utils/nativeDownload', () => ({
  isNativePlatform: vi.fn(() => false),
  openNative: vi.fn(),
}))

const { resolveTeacherProfileUrl } = await import('../../utils/document')
const TeacherBadge = (await import('./TeacherBadge')).default

describe('resolveTeacherProfileUrl', () => {
  it('extrait l’URL posée par TeacherLinksSeeder', () => {
    expect(resolveTeacherProfileUrl({
      description: 'Profil UB (Liberata NIZIGIYIMANA) : https://www.ub.edu.bi/Publication/syllabus_article/124',
    })).toBe('https://www.ub.edu.bi/Publication/syllabus_article/124')
  })

  it('retourne null sans URL', () => {
    expect(resolveTeacherProfileUrl({ description: 'Cours de chimie.' })).toBeNull()
    expect(resolveTeacherProfileUrl(null)).toBeNull()
  })
})

describe('TeacherBadge (rendu)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rend le badge enseignant + bouton profil', async () => {
    const React = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const html = renderToStaticMarkup(
      React.createElement(TeacherBadge, {
        course: {
          teacher: 'Liberata NIZIGIYIMANA',
          description: 'Profil UB (Liberata NIZIGIYIMANA) : https://www.ub.edu.bi/Publication/syllabus_article/124',
        },
      }),
    )
    expect(html).toContain('Enseignant titulaire')
    expect(html).toContain('Liberata NIZIGIYIMANA')
    expect(html).toContain('Voir le profil')
  })

  it('ne rend rien sans enseignant', async () => {
    const React = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    expect(renderToStaticMarkup(React.createElement(TeacherBadge, { course: { teacher: '' } }))).toBe('')
  })

  it('badge sans bouton si pas d’URL profil', async () => {
    const React = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const html = renderToStaticMarkup(
      React.createElement(TeacherBadge, {
        course: { teacher: 'Dr. Nkurunziza', description: null },
      }),
    )
    expect(html).toContain('Dr. Nkurunziza')
    expect(html).not.toContain('Voir le profil')
  })
})
