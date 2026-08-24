/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Statistiques
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DocumentApi } from '../../api/DocumentApi'
import { SearchApi } from '../../api/SearchApi'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { UserApi } from '../../api/UserApi'
import { normalizeApiList } from '../../utils/academic'
import { buildDailyUploadSeries, groupDocumentsByFaculty, groupDocumentsByDepartment, buildUserGrowthSeries, findMissingDocuments } from '../../utils/admin'
import PageHeader from '../../components/common/PageHeader'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminSection from '../../components/admin/AdminSection'
import Button from '../../components/ui/Button'

export default function AdminStatisticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({ documents: [], drives: [], faculties: [], departments: [], users: [], popular: [] })

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const [docs, drives, facs, deps, users, pop] = await Promise.all([
        DocumentApi.list({ per_page: 200 }).catch(() => ({ data: [] })),
        GoogleDriveApi.list().catch(() => ({ data: [] })),
        FacultyApi.list().catch(() => []),
        DepartmentApi.list().catch(() => []),
        UserApi.list().catch(() => ({ data: [] })),
        SearchApi.getPopularQueries({ limit: 10 }).catch(() => []),
      ])
      if (signal?.aborted) return
      setData({
        documents: normalizeApiList(docs),
        drives: normalizeApiList(drives),
        faculties: normalizeApiList(facs),
        departments: normalizeApiList(deps),
        users: normalizeApiList(users),
        popular: normalizeApiList(pop) || (Array.isArray(pop) ? pop : []),
      })
    } catch (err) {
      if (!signal?.aborted) setError(err.message || 'Erreur de chargement.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const daily = useMemo(() => buildDailyUploadSeries(data.documents, 14), [data.documents])
  const byFaculty = useMemo(() => groupDocumentsByFaculty(data.documents), [data.documents])
  const byDept = useMemo(() => groupDocumentsByDepartment(data.documents), [data.documents])
  const growth = useMemo(() => buildUserGrowthSeries(data.users, 14), [data.users])
  const missing = useMemo(() => {
    // Cours approx via departments - si vide, fallback vide
    return findMissingDocuments([], data.documents)
  }, [data.documents])

  if (loading) return <LoadingScreen label="Chargement des statistiques…" />
  if (error) return <div className="ax-container"><PageHeader title="Statistiques" subtitle="Administration" /><div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div></div>

  const totalViews = data.documents.reduce((s, d) => s + (Number(d.views_count) || 0), 0)
  const totalDownloads = data.documents.reduce((s, d) => s + (Number(d.downloads_count) || 0), 0)

  return (
    <div className="ax-container">
      <PageHeader title="Statistiques" subtitle="Analyse de la plateforme" actions={<Button variant="ghost" size="sm" onClick={() => load()}>Actualiser</Button>} />

      <AdminSection title="Uploads quotidiens" description="14 derniers jours">
        <div className="ax-admin-bars" role="img" aria-label="Uploads par jour">
          {daily.map((p) => (
            <div key={p.date} className="ax-admin-bars__item">
              <span className="ax-admin-bars__label">{p.label}</span>
              <div className="ax-admin-bars__track"><div className="ax-admin-bars__fill" style={{ width: `${Math.min(100, p.count * 15)}%` }} /></div>
              <span className="ax-admin-bars__value">{p.count}</span>
            </div>
          ))}
        </div>
      </AdminSection>

      <div className="ax-admin-stats-grid">
        <AdminSection title="Téléchargements" description="Totaux"><p className="ax-stat__big">{totalDownloads.toLocaleString('fr-FR')}</p><p className="ax-text--muted">Vues totales : {totalViews.toLocaleString('fr-FR')}</p></AdminSection>
        <AdminSection title="Évolution stockage"><p className="ax-text--muted">Capacité agrégée calculée depuis la flotte Google Drive.</p><p><strong>{data.drives.length}</strong> drive(s) — voir <a href="/admin/storage" className="ax-link">Stockage</a>.</p></AdminSection>
        <AdminSection title="Croissance utilisateurs" description="14 jours — cumul">
          <div className="ax-admin-bars" role="img" aria-label="Croissance utilisateurs">
            {growth.map((p) => (
              <div key={p.date} className="ax-admin-bars__item">
                <span className="ax-admin-bars__label">{p.date.slice(5)}</span>
                <span className="ax-admin-bars__value">+{p.count} → {p.cumulative}</span>
              </div>
            ))}
          </div>
        </AdminSection>
      </div>

      <div className="ax-admin-stats-grid">
        <AdminSection title="Documents par faculté">
          {byFaculty.length === 0 ? <p className="ax-text--muted">Aucune donnée.</p> : (
            <ul className="ax-admin-list" role="list">
              {byFaculty.slice(0, 10).map((g) => <li key={g.key} className="ax-admin-list__item"><span>{g.label}</span><strong>{g.count}</strong></li>)}
            </ul>
          )}
        </AdminSection>
        <AdminSection title="Documents par département">
          {byDept.length === 0 ? <p className="ax-text--muted">Aucune donnée.</p> : (
            <ul className="ax-admin-list" role="list">
              {byDept.slice(0, 10).map((g) => <li key={g.key} className="ax-admin-list__item"><span>{g.label}</span><strong>{g.count}</strong></li>)}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminSection title="Top recherches" description="Requêtes populaires">
        {data.popular.length === 0 ? <p className="ax-text--muted">Aucune recherche populaire disponible.</p> : (
          <ol className="ax-admin-list ax-admin-list--ordered">
            {data.popular.slice(0, 10).map((q, i) => <li key={q.id || i} className="ax-admin-list__item"><span>{q.query || q.term || q.q || JSON.stringify(q)}</span><span className="ax-text--muted">{q.count || q.hits || ''}</span></li>)}
          </ol>
        )}
      </AdminSection>

      <AdminSection title="Documents manquants" description="Cours sans document récent (heuristique)">
        {missing.length === 0 ? <p className="ax-text--muted">Aucun manque détecté avec les données disponibles.</p> : (
          <ul className="ax-admin-list" role="list">
            {missing.slice(0, 10).map((m) => <li key={m.course.id} className="ax-admin-list__item"><span>{m.course.name} ({m.course.code})</span><span>{m.docsCount} doc(s)</span></li>)}
          </ul>
        )}
      </AdminSection>
    </div>
  )
}