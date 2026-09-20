/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Tableau de bord
 * ---------------------------------------------------------------------------
 * Page protegee avec donnees reelles et etats loading/error/empty.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { FacultyApi } from '../api/FacultyApi'
import { DocumentApi } from '../api/DocumentApi'
import { normalizeApiList, normalizeApiPagination } from '../utils/academic'
import { PageTitle, StatCard, Card, Container, LoadingSpinner, Badge } from '../components/ui'
import { levelForUploadCount, badgesForUploadCount } from '../utils/gamification'

/**
 * @returns {import('react').JSX.Element}
 */
export default function DashboardPage() {
  const { user } = useAuth()

  const [stats, setStats] = useState({ faculties: 0, departments: 0, documents: 0, users: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [facultiesRes, docsRes] = await Promise.all([
          FacultyApi.list().catch(() => []),
          DocumentApi.list({ per_page: 1 }).catch(() => null),
        ])
        if (cancelled) return
        const faculties = normalizeApiList(facultiesRes)
        const pagination = docsRes ? normalizeApiPagination(docsRes) : null
        const documents = pagination ? pagination.total : normalizeApiList(docsRes).length

        let departments = 0
        for (const f of faculties) {
          if (f.departments_count) {
            departments += f.departments_count
          }
        }
        // Fallback si departments_count absent, compter via API departements si besoin
        if (departments === 0) {
          try {
            const { DepartmentApi } = await import('../api/DepartmentApi.js')
            const deps = normalizeApiList(await DepartmentApi.list().catch(() => []))
            if (!cancelled) departments = deps.length
          } catch {
            // ignore
          }
        }

        let users = 0
        try {
          const { UserApi } = await import('../api/UserApi.js')
          const u = await UserApi.list().catch(() => null)
          if (u) users = normalizeApiList(u).length
        } catch {
          users = 0
        }

        if (!cancelled) setStats({ faculties: faculties.length, departments, documents, users })
      } catch {
        if (!cancelled) setError('Impossible de charger les statistiques.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const level = levelForUploadCount(user?.uploads_count)
  const badges = badgesForUploadCount(user?.uploads_count)

  return (
    <Container>
      <PageTitle
        title={`Bonjour, ${user?.name || 'Utilisateur'}`}
        subtitle="Voici un apercu de votre activite"
      />

      {/* Badge de niveau dynamique (dépôts approuvés) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--ax-space-4)' }} aria-label="Niveau et badges">
        <Badge variant="primary" size="md">{level.icon} {level.label}</Badge>
        {badges.map((b) => (
          <Badge key={b.key} variant={b.key === 'vip' ? 'primary' : 'default'} size="md">{b.icon} {b.label}</Badge>
        ))}
      </div>

      {isLoading && (
        <div style={{ padding: 'var(--ax-space-8) 0' }}>
          <LoadingSpinner label="Chargement des statistiques..." />
        </div>
      )}

      {error && !isLoading && (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="ax-dashboard-grid">
          <StatCard
            icon={<span role="img" aria-label="Facultes">🏛</span>}
            label="Facultes"
            value={String(stats.faculties)}
          />
          <StatCard
            icon={<span role="img" aria-label="Departements">🏢</span>}
            label="Departements"
            value={String(stats.departments)}
          />
          <StatCard
            icon={<span role="img" aria-label="Documents">📄</span>}
            label="Documents"
            value={String(stats.documents)}
          />
          <StatCard
            icon={<span role="img" aria-label="Utilisateurs">👥</span>}
            label="Utilisateurs"
            value={String(stats.users)}
          />
        </div>
      )}

      <Card>
        <div className="ax-card__header">
          <h3 style={{ fontSize: 'var(--ax-text-base)', fontWeight: 'var(--ax-font-semibold)' }}>
            Activite recente
          </h3>
        </div>
        <div className="ax-card__body">
          <p style={{ color: 'var(--ax-text-secondary)', fontSize: 'var(--ax-text-sm)' }}>
            Aucune activite recente. Commencez par explorer les documents disponibles.
          </p>
        </div>
      </Card>
    </Container>
  )
}
