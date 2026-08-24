/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Tableau de bord
 * ---------------------------------------------------------------------------
 * Page protegee avec donnees reelles et etats loading/error/empty.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { FacultyApi } from '../api/FacultyApi'
import { PageTitle, StatCard, Card, Container, LoadingSpinner } from '../components/ui'

/**
 * @returns {import('react').JSX.Element}
 */
export default function DashboardPage() {
  const { user } = useAuth()

  const [stats, setStats] = useState({ faculties: 0, departments: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const facultiesRes = await FacultyApi.list()
        if (cancelled) return
        const faculties = Array.isArray(facultiesRes)
          ? facultiesRes
          : Array.isArray(facultiesRes?.data)
            ? facultiesRes.data
            : []

        let departments = 0
        for (const f of faculties) {
          if (f.departments_count) {
            departments += f.departments_count
          }
        }

        setStats({ faculties: faculties.length, departments })
      } catch {
        if (!cancelled) setError('Impossible de charger les statistiques.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return (
    <Container>
      <PageTitle
        title={`Bonjour, ${user?.name || 'Utilisateur'}`}
        subtitle="Voici un apercu de votre activite"
      />

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
            value="0"
          />
          <StatCard
            icon={<span role="img" aria-label="Utilisateurs">👥</span>}
            label="Utilisateurs"
            value="0"
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
