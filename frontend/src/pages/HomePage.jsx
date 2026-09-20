/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Page d'accueil
 * ---------------------------------------------------------------------------
 * Hero (slogan POILISSIME + accueil ALPHIX) + statistiques + documents populaires + CTA.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants/routes'
import { StatCard, Container, Section, Badge } from '../components/ui'
import DocumentSearchBar from '../components/documents/DocumentSearchBar'
import { FacultyApi } from '../api/FacultyApi'
import { CourseApi } from '../api/CourseApi'
import { DocumentApi } from '../api/DocumentApi'
import { normalizeApiList, normalizeApiPagination } from '../utils/academic'
import { cachedAcademicList } from '../utils/academicCache'

const QUICK_CHIPS = ['Chimie', 'Informatique', 'Examens', 'BAC 3']

/**
 * @returns {import('react').JSX.Element}
 */
export default function HomePage() {
  const navigate = useNavigate()
  const [heroQuery, setHeroQuery] = useState('')
  const [stats, setStats] = useState({ documents: null, faculties: null, courses: null, users: null })
  const [popular, setPopular] = useState([])
  const [popularLoading, setPopularLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // 4 requetes uniques en parallele + cache session (plus de fan-out 30x).
        const [facs, docsRes, coursesList] = await Promise.all([
          cachedAcademicList('faculties', () => FacultyApi.list()),
          DocumentApi.list({ per_page: 1 }).catch(() => null),
          cachedAcademicList('courses', () => CourseApi.list()),
        ])
        if (cancelled) return
        const faculties = normalizeApiList(facs).length
        const pagination = docsRes ? normalizeApiPagination(docsRes) : null
        const documents = pagination ? pagination.total : normalizeApiList(docsRes).length
        const courses = normalizeApiList(coursesList).length
        if (cancelled) return
        // Utilisateurs : public non authentifié → 401 → affiche — (pas de fake)
        let users = null
        try {
          const { UserApi } = await import('../api/UserApi.js')
          const u = await UserApi.list().catch(() => null)
          if (u) users = normalizeApiList(u).length
        } catch {
          users = null
        }
        if (!cancelled) setStats({ documents, faculties, courses, users })
      } catch {
        if (!cancelled) setStats({ documents: 0, faculties: 0, courses: 0, users: 0 })
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await DocumentApi.getFeatured({ limit: 6 }).catch(() => [])
        if (!cancelled) setPopular(normalizeApiList(res))
      } finally {
        if (!cancelled) setPopularLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const fmt = (v) => (v == null ? '—' : String(v))

  const submitHeroSearch = (value) => {
    const q = String(value ?? heroQuery).trim()
    navigate(q ? `${ROUTE_PATHS.SEARCH}?q=${encodeURIComponent(q)}` : ROUTE_PATHS.SEARCH)
  }

  return (
    <>
      {/* Hero */}
      <div className="ax-hero">
        <Container>
          <div className="ax-hero__badge">
            Plateforme documentaire universitaire
          </div>

          {/* Slogan — accroche premiere seconde : emotions (couleurs nationales),
              logique (hierarchie) et esprit (lueur douce, mouvement calme) */}
          <p className="ax-hero__slogan">
            <span className="ax-hero__slogan-word">POILISSIME</span>
            <span className="ax-hero__slogan-tag">🇧🇮️ UB</span>
          </p>

          <h1 className="ax-hero__title">
            Bienvenue sur <span className="ax-hero__title-highlight">ALPHIX</span>
          </h1>

          <p className="ax-hero__subtitle">
            La plateforme de reference pour les documents universitaires du Burundi.
            Accedez, partagez et decouvrez les ressources academiques d&apos;excellence.
          </p>

          <div className="ax-hero__search">
            <DocumentSearchBar
              value={heroQuery}
              onChange={setHeroQuery}
              onSubmit={submitHeroSearch}
              placeholder="Rechercher un cours, un document, un code..."
            />
            <div className="ax-doc-tags ax-hero__chips" aria-label="Recherches rapides">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="ax-icon-btn ax-icon-btn--sm"
                  onClick={() => navigate(`${ROUTE_PATHS.SEARCH}?q=${encodeURIComponent(chip)}`)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="ax-hero__actions">
            <Link to={ROUTE_PATHS.DOCUMENTS} className="ax-btn ax-btn--primary ax-btn--lg">
              Explorer
            </Link>
            <Link to={ROUTE_PATHS.LOGIN} className="ax-btn ax-btn--outline ax-btn--lg">
              Connexion
            </Link>
          </div>

          {/* Stats — branchées sur la base réelle */}
          <div className="ax-hero__stats">
            <StatCard
              icon={<span role="img" aria-label="Documents">📄</span>}
              label="Documents"
              value={fmt(stats.documents)}
            />
            <StatCard
              icon={<span role="img" aria-label="Facultes">🏛</span>}
              label="Facultes"
              value={fmt(stats.faculties)}
            />
            <StatCard
              icon={<span role="img" aria-label="Cours">📖</span>}
              label="Cours"
              value={fmt(stats.courses)}
            />
            <StatCard
              icon={<span role="img" aria-label="Utilisateurs">👥</span>}
              label="Utilisateurs"
              value={fmt(stats.users)}
            />
          </div>
        </Container>
      </div>

      {/* Popular */}
      <Section title="Documents Populaires" subtitle="Les ressources les plus consultees">
        <Container>
          {popularLoading ? (
            <p className="ax-text--muted">Chargement des documents populaires...</p>
          ) : popular.length === 0 ? (
            <p className="ax-text--muted">Aucun document populaire pour le moment.</p>
          ) : (
            <div className="ax-course-grid ax-popular-grid">
              {popular.map((doc) => (
                <Link
                  key={doc.id ?? doc.slug}
                  to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}`}
                  className="ax-card ax-card--padded ax-popular-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <Badge variant="primary" size="sm">{doc.doc_type || 'document'}</Badge>
                    <Badge variant="default" size="sm">🔥 {doc.downloads_count ?? doc.views_count ?? 0}</Badge>
                  </div>
                  <h3 className="ax-popular-card__title">{doc.title || doc.slug}</h3>
                  <p className="ax-text--muted ax-text--xs">{doc.original_name || ''}</p>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* CTA */}
      <Section>
        <Container size="sm">
          <div style={{ textAlign: 'center', padding: 'var(--ax-space-8) 0 var(--ax-space-12)' }}>
            <h2 style={{ fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-font-bold)', marginBottom: 'var(--ax-space-4)' }}>
              Pret a commencer ?
            </h2>
            <p style={{ color: 'var(--ax-text-secondary)', marginBottom: 'var(--ax-space-6)', fontSize: 'var(--ax-text-sm)' }}>
              Rejoignez la communaute universitaire et accedez a des milliers de documents.
            </p>
            <Link to={ROUTE_PATHS.REGISTER} className="ax-btn ax-btn--primary ax-btn--lg">
              Creer un compte
            </Link>
          </div>
        </Container>
      </Section>
    </>
  )
}
