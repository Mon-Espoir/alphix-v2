/**
 * ALPHIX V2 — Tests CourseCard (carte systématique, même sans documents).
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}))

vi.mock('../../utils/nativeDownload', () => ({
  isNativePlatform: vi.fn(() => false),
  openNative: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Link: ({ to, children, className }) => `<a href="${to}" class="${className}">${Array.isArray(children) ? children.join('') : children}</a>`,
  }
})

const CourseCard = (await import('./CourseCard')).default

async function render(course, props = {}) {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  return renderToStaticMarkup(React.createElement(CourseCard, { course, ...props }))
}

const bareCourse = {
  id: 117,
  code: 'CHI3618',
  title: 'Projet personnel et déroulement',
  documents_count: 0,
  teacher: null,
  description: null,
  department: { name: 'Département de Chimie', faculty: { name: 'Faculté des Sciences' } },
  level: { name: 'Baccalauréat 3' },
  semester: { name: 'Semestre 2' },
}

describe('CourseCard sans documents', () => {
  it('affiche nom, code, mention et aucun lien Voir documents', async () => {
    const html = await render(bareCourse)
    expect(html).toContain('Projet personnel et déroulement')
    expect(html).toContain('CHI3618')
    expect(html).toContain('Aucun document disponible pour le moment')
    expect(html).not.toContain('Voir documents')
  })

  it('affiche le TeacherBadge quand un enseignant est renseigné', async () => {
    const html = await render({
      ...bareCourse,
      teacher: 'Liberata NIZIGIYIMANA',
      description: 'Profil UB (Liberata NIZIGIYIMANA) : https://www.ub.edu.bi/Publication/syllabus_article/124',
    })
    expect(html).toContain('Enseignant titulaire')
    expect(html).toContain('Liberata NIZIGIYIMANA')
    expect(html).toContain('Voir le profil')
    expect(html).toContain('Aucun document disponible pour le moment')
  })
})

describe('CourseCard avec documents', () => {
  it('affiche le compteur, le lien et aucune mention vide', async () => {
    const html = await render({ ...bareCourse, documents_count: 12 })
    expect(html).toContain('12 documents')
    expect(html).toContain('Voir documents (12)')
    expect(html).not.toContain('Aucun document disponible')
  })
})
