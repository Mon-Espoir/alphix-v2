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
import { paginate } from '../../utils/admin'
import PageHeader from '../../components/common/PageHeader'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminSearchBar from '../../components/admin/AdminSearchBar'
import AdminTable from '../../components/admin/AdminTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const LEVEL_VARIANT = { info: 'default', warning: 'warning', error: 'danger', security: 'primary', critical: 'danger' }

// Icônes Appareil
const DeviceIcon = ({ type }) => {
  const t = String(type || '').toLowerCase()
  if (t.includes('mobile') || t.includes('smartphone')) return <span aria-hidden="true" title="Smartphone">📱</span>
  if (t.includes('tablet') || t.includes('ipad')) return <span aria-hidden="true" title="Tablette">📱</span>
  return <span aria-hidden="true" title="PC">💻</span>
}

function formatDeviceCell(log) {
  const info = log.device_info || log.context?.device_info || {}
  const deviceInfo = typeof info === 'string' ? info : info.device_info || ''
  const deviceType = info.device_type || (deviceInfo.includes('Mobile') ? 'Mobile' : deviceInfo.includes('Tablet') ? 'Tablet' : 'Desktop')
  const brand = info.brand || ''
  const model = info.model || ''
  const platform = info.platform || ''
  const browser = info.browser || ''
  const label = deviceInfo || [deviceType, platform, browser, brand, model].filter(Boolean).join(' • ')
  return { deviceType, brand, model, platform, browser, label: label || '—' }
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [eventType, setEventType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
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



  const filtered = useMemo(() => {
    let list = Array.isArray(logs) ? [...logs] : []
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((l) => {
        const hay = `${l.message || ''} ${l.details || ''} ${l.event_type || ''} ${l.module || ''} ${l.action || ''} ${l.user?.email || ''} ${l.user?.name || ''} ${l.ip_address || ''} ${JSON.stringify(l.device_info || l.context?.device_info || '')}`.toLowerCase()
        return hay.includes(q)
      })
    }
    if (level) list = list.filter((l) => String(l.level || '').toLowerCase() === level.toLowerCase() || String(l.status || '').toLowerCase() === level.toLowerCase())
    if (eventType) list = list.filter((l) => String(l.event_type || '').toLowerCase() === eventType.toLowerCase())
    if (fromDate) {
      const from = new Date(fromDate).getTime()
      if (Number.isFinite(from)) list = list.filter((l) => new Date(l.created_at).getTime() >= from)
    }
    if (toDate) {
      const to = new Date(toDate)
      to.setHours(23, 59, 59, 999)
      const toMs = to.getTime()
      if (Number.isFinite(toMs)) list = list.filter((l) => new Date(l.created_at).getTime() <= toMs)
    }
    return list
  }, [logs, query, level, eventType, fromDate, toDate])
  const paginated = useMemo(() => paginate(filtered, page, 15), [filtered, page])

  const eventOptions = useMemo(() => {
    const set = new Set()
    for (const l of logs) if (l.event_type) set.add(l.event_type)
    return [...set].sort()
  }, [logs])

  if (loading) return <LoadingScreen label="Chargement des journaux…" />
  if (error) return <div className="ax-container"><PageHeader title="Journaux système" subtitle="Historique" /><div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div></div>

  const handleExportCsv = () => {
    const header = ['Date', 'Niveau', 'Event Type', 'Message', 'Utilisateur', 'IP', 'Appareil']
    const lines = [header.join(';')]
    for (const l of filtered) {
      const dev = formatDeviceCell(l)
      const row = [
        l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : '',
        l.level || l.status || '',
        l.event_type || '',
        `"${String(l.message || l.details || '').replace(/"/g, '""')}"`,
        l.user?.email || l.user?.name || l.user_id || 'Anonymous',
        l.ip_address || '',
        `"${dev.label.replace(/"/g, '""')}"`,
      ]
      lines.push(row.join(';'))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alphix-logs-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { key: 'created_at', label: 'Date', render: (v) => (v ? new Date(v).toLocaleString('fr-FR') : '—') },
    { key: 'level', label: 'Niveau', render: (v) => <Badge variant={LEVEL_VARIANT[v] || 'default'} size="sm">{v || '—'}</Badge> },
    { key: 'event_type', label: 'Événement', render: (v) => <span className="ax-text--mono ax-text--xs">{v || '—'}</span> },
    { key: 'message', label: 'Message', render: (v) => <span className="ax-text--truncate" title={v}>{String(v || '—').slice(0,120)}</span> },
    { key: 'user', label: 'Utilisateur', render: (_, row) => row.user?.email || row.user?.name || (row.user_id ? `ID ${row.user_id}` : 'Anonymous') },
    { key: 'ip_address', label: 'IP', render: (v) => <span className="ax-text--mono ax-text--xs">{v || '—'}</span> },
    {
      key: 'device',
      label: 'Appareil & Marque',
      render: (_, row) => {
        const dev = formatDeviceCell(row)
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dev.label}>
            <DeviceIcon type={dev.deviceType} />
            <span className="ax-text--xs">{dev.label}</span>
          </span>
        )
      },
    },
  ]
  const rows = paginated.items.map((l, i) => ({
    key: l.id || i,
    created_at: l.created_at,
    level: l.level || l.status,
    event_type: l.event_type,
    message: l.message || l.details,
    user: l.user,
    user_id: l.user_id,
    ip_address: l.ip_address,
    device: l,
    // keep full row for device formatter
    ...l,
  }))

  return (
    <div className="ax-container">
      <PageHeader
        title="Journaux système"
        subtitle={`${filtered.length} entrées — opérations, erreurs, sécurité`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>Exporter CSV</Button>
            <Button variant="ghost" size="sm" onClick={() => load()}>Actualiser</Button>
          </div>
        }
      />

      <div className="ax-admin-filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <AdminSearchBar value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Email, IP, appareil ou message…" />
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
        <label className="ax-field">
          <span className="ax-field__label">Type d’événement</span>
          <select className="ax-input" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1) }}>
            <option value="">Tous</option>
            {eventOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="ax-field">
          <span className="ax-field__label">Du</span>
          <input className="ax-input" type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} />
        </label>
        <label className="ax-field">
          <span className="ax-field__label">Au</span>
          <input className="ax-input" type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} />
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