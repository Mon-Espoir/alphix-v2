/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Journaux système
 * ---------------------------------------------------------------------------
 * Historique opérations, erreurs, avertissements, événements sécurité.
 * Dérive d'appels disponibles ; si un endpoint dédié n'existe pas, affiche
 * un état explicite (pas de données fabriquées).
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useMemo } from 'react'
import httpService from '../../services/httpService'
import { normalizeApiList } from '../../utils/academic'
import { filterLogs, paginate } from '../../utils/admin'
import PageHeader from '../../components/common/PageHeader'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminSearchBar from '../../components/admin/AdminSearchBar'
import AdminTable from '../../components/admin/AdminTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const LEVEL_VARIANT = { info: 'default', warning: 'warning', error: 'danger', security: 'primary' }

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      // Endpoint hypothétique system-logs — tolérant si 404
      const res = await httpService.get('/system-logs', { params: { per_page: 100 }, signal }).catch((err) => {
        if (err?.status === 404) return { data: [] }
        throw err
      })
      if (signal?.aborted) return
      setLogs(normalizeApiList(res))
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



  const filtered = useMemo(() => filterLogs(logs, { query, level }), [logs, query, level])
  const paginated = useMemo(() => paginate(filtered, page, 15), [filtered, page])

  if (loading) return <LoadingScreen label="Chargement des journaux…" />
  if (error) return <div className="ax-container"><PageHeader title="Journaux système" subtitle="Historique" /><div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div></div>

  const columns = [
    { key: 'created_at', label: 'Date', render: (v) => (v ? new Date(v).toLocaleString('fr-FR') : '—') },
    { key: 'level', label: 'Niveau', render: (v) => <Badge variant={LEVEL_VARIANT[v] || 'default'} size="sm">{v || '—'}</Badge> },
    { key: 'module', label: 'Module' },
    { key: 'action', label: 'Action' },
    { key: 'message', label: 'Message', render: (v) => <span className="ax-text--truncate" title={v}>{v || '—'}</span> },
    { key: 'user', label: 'Utilisateur', render: (_, row) => row.user?.name || row.user_id || '—' },
  ]
  const rows = paginated.items.map((l, i) => ({ key: l.id || i, created_at: l.created_at, level: l.level, module: l.module, action: l.action, message: l.message, user: l.user, user_id: l.user_id }))

  return (
    <div className="ax-container">
      <PageHeader title="Journaux système" subtitle={`${filtered.length} entrées — opérations, erreurs, sécurité`} actions={<Button variant="ghost" size="sm" onClick={() => load()}>Actualiser</Button>} />

      <div className="ax-admin-filters">
        <AdminSearchBar value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Message, module ou action…" />
        <label className="ax-field">
          <span className="ax-field__label">Niveau</span>
          <select className="ax-input" value={level} onChange={(e) => { setLevel(e.target.value); setPage(1) }}>
            <option value="">Tous</option>
            <option value="info">Info</option>
            <option value="warning">Avertissements</option>
            <option value="error">Erreurs</option>
            <option value="security">Sécurité</option>
          </select>
        </label>
      </div>

      {logs.length === 0 ? (
        <div className="ax-card ax-card--padded">
          <p className="ax-text--muted">Aucun journal système retourné par l’API. Si l’endpoint <code className="ax-text--mono">/system-logs</code> n’est pas exposé, cette section affiche l’état vide par conception (aucune donnée fabriquée).</p>
        </div>
      ) : (
        <AdminTable columns={columns} rows={rows} caption="Journaux système" pagination={paginated} onPageChange={setPage} />
      )}
    </div>
  )
}