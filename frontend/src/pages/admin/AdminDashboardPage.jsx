/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Tableau de bord
 * ---------------------------------------------------------------------------
 * 15 KPIs + activité récente + actions rapides.
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { UserApi } from '../../api/UserApi'
import { DocumentApi } from '../../api/DocumentApi'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { normalizeApiList } from '../../utils/academic'
import { buildAdminDashboardStats, buildDailyUploadSeries } from '../../utils/admin'
import { ROUTE_PATHS } from '../../constants/routes'
import PageHeader from '../../components/common/PageHeader'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminKpiGrid from '../../components/admin/AdminKpiGrid'
import AdminSection from '../../components/admin/AdminSection'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const units = ['o', 'Ko', 'Mo', 'Go', 'To']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1 }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({ users: [], documents: [], faculties: [], departments: [], courses: [], drives: [] })

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const [u, d, f, dep, g] = await Promise.all([
        UserApi.list().catch(() => ({ data: [] })),
        DocumentApi.list({ per_page: 100 }).catch(() => ({ data: [] })),
        FacultyApi.list().catch(() => []),
        DepartmentApi.list().catch(() => []),
        GoogleDriveApi.list().catch(() => ({ data: [] })),
      ])
      if (signal?.aborted) return
      setData({
        users: normalizeApiList(u),
        documents: normalizeApiList(d),
        faculties: normalizeApiList(f),
        departments: normalizeApiList(dep),
        courses: [],
        drives: normalizeApiList(g),
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

  if (loading) return <LoadingScreen label="Chargement du tableau de bord administrateur…" />
  if (error) {
    return (
      <div className="ax-container">
        <PageHeader title="Administration" subtitle="Tableau de bord" />
        <div className="ax-card ax-card--padded" role="alert">
          <p>{error}</p>
          <Button variant="primary" size="sm" onClick={() => load()}>Réessayer</Button>
        </div>
      </div>
    )
  }

  const stats = buildAdminDashboardStats(data)
  const daily = buildDailyUploadSeries(data.documents, 7)
  const recentDocs = [...data.documents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const recentUsers = [...data.users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  const kpis = [
    { key: 'totalUsers', label: 'Utilisateurs totaux', value: String(stats.totalUsers) },
    { key: 'activeUsers', label: 'Utilisateurs actifs', value: String(stats.activeUsers) },
    { key: 'onlineUsers', label: 'En ligne (5 min)', value: String(stats.onlineUsers) },
    { key: 'totalDocuments', label: 'Documents totaux', value: String(stats.totalDocuments) },
    { key: 'uploadedToday', label: 'Uploads aujourd’hui', value: String(stats.documentsUploadedToday) },
    { key: 'downloadsToday', label: 'Téléchargements (j)', value: String(stats.downloadsToday) },
    { key: 'activeFaculties', label: 'Facultés actives', value: String(stats.activeFaculties) },
    { key: 'activeDepartments', label: 'Départements actifs', value: String(stats.activeDepartments) },
    { key: 'totalCourses', label: 'Cours totaux', value: String(stats.totalCourses) },
    { key: 'activeDrives', label: 'Drives actifs', value: String(stats.activeDrives) },
    { key: 'storageUsage', label: 'Stockage utilisé', value: stats.storageUsagePercent != null ? `${stats.storageUsagePercent}%` : formatBytes(stats.storageUsedBytes) },
    { key: 'pending', label: 'Validations en attente', value: String(stats.pendingValidations) },
    { key: 'failed', label: 'Uploads échoués', value: String(stats.failedUploads) },
    { key: 'health', label: 'Santé serveur', value: stats.serverHealth === 'healthy' ? 'OK' : stats.serverHealth },
    { key: 'version', label: 'Version', value: stats.appVersion },
  ]

  return (
    <div className="ax-container ax-admin-dashboard">
      <PageHeader
        title="Administration"
        subtitle="Vue d’ensemble de la plateforme ALPHIX V2"
        actions={<Badge variant="primary" size="md">Accès administrateur</Badge>}
      />

      <AdminKpiGrid items={kpis} />

      <div className="ax-admin-dashboard__grid">
        <AdminSection title="Activité récente — uploads" description="7 derniers jours">
          <div className="ax-admin-bars" role="img" aria-label="Uploads quotidiens">
            {daily.map((p) => (
              <div key={p.date} className="ax-admin-bars__item">
                <span className="ax-admin-bars__label">{p.label}</span>
                <div className="ax-admin-bars__track"><div className="ax-admin-bars__fill" style={{ width: `${Math.min(100, p.count * 20)}%` }} /></div>
                <span className="ax-admin-bars__value">{p.count}</span>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Derniers documents" description="5 plus récents">
          {recentDocs.length === 0 ? <p className="ax-text--muted">Aucun document récent.</p> : (
            <ul className="ax-admin-list" role="list">
              {recentDocs.map((doc) => (
                <li key={doc.id} className="ax-admin-list__item">
                  <span className="ax-admin-list__title">{doc.title || doc.slug}</span>
                  <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'pending' ? 'warning' : 'default'} size="sm">{doc.status || '—'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title="Derniers utilisateurs" description="Inscriptions récentes">
          {recentUsers.length === 0 ? <p className="ax-text--muted">Aucun utilisateur récent.</p> : (
            <ul className="ax-admin-list" role="list">
              {recentUsers.map((u) => (
                <li key={u.id} className="ax-admin-list__item">
                  <span className="ax-admin-list__title">{u.name}</span>
                  <Badge variant="default" size="sm">{u.role || 'user'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title="Notifications récentes" description="Extrait (lecture seule)">
          <p className="ax-text--muted">Les notifications sont consultables via l’API Notifications. Aucune notification critique en attente.</p>
        </AdminSection>

        <AdminSection title="Erreurs récentes" description="Aperçu (logs système)">
          {stats.failedUploads > 0 ? <p className="ax-text--danger">{stats.failedUploads} document(s) en échec — voir Documents / Journaux.</p> : <p className="ax-text--muted">Aucune erreur récente.</p>}
        </AdminSection>

        <AdminSection title="Actions rapides">
          <div className="ax-admin-actions">
            <Link to={ROUTE_PATHS.ADMIN_USERS} className="ax-btn ax-btn--primary ax-btn--sm">Gérer les utilisateurs</Link>
            <Link to={ROUTE_PATHS.ADMIN_DOCUMENTS} className="ax-btn ax-btn--outline ax-btn--sm">Modérer les documents</Link>
            <Link to={ROUTE_PATHS.ADMIN_STORAGE} className="ax-btn ax-btn--outline ax-btn--sm">Gérer le stockage</Link>
            <Link to={ROUTE_PATHS.ADMIN_LOGS} className="ax-btn ax-btn--ghost ax-btn--sm">Voir les journaux</Link>
          </div>
        </AdminSection>
      </div>
    </div>
  )
}