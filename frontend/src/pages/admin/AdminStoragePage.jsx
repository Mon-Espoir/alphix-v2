/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Stockage (Google Drive - lecture seule admin)
 * ---------------------------------------------------------------------------
 * AUCUNE modification du moteur d'upload. Administration pure : liste, santé,
 * priorité, usage, drive par défaut, connectivité, synchronisation manuelle,
 * statistiques.
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { AutomationApi } from '../../api/AutomationApi'
import { normalizeApiList } from '../../utils/academic'
import { computeStorageStats } from '../../utils/admin'
import PageHeader from '../../components/common/PageHeader'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminSection from '../../components/admin/AdminSection'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useNotification } from '../../hooks/useNotification'

function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const units = ['o', 'Ko', 'Mo', 'Go', 'To']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1 }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const HEALTH_VARIANT = { healthy: 'success', warning: 'warning', critical: 'danger', degraded: 'warning' }

export default function AdminStoragePage() {
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [connectivity, setConnectivity] = useState({})
  const notify = useNotification()

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await GoogleDriveApi.list()
      if (signal?.aborted) return
      setDrives(normalizeApiList(res))
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

  const handleSync = useCallback(async (drive) => {
    setSyncing(drive.id)
    try {
      await AutomationApi.synchronizeDrive(drive.id)
      notify.success(`Synchronisation lancée pour ${drive.name}.`)
      await load()
    } catch { notify.error('Échec de la synchronisation.') }
    finally { setSyncing(null) }
  }, [notify, load])

  const handleConnectivity = useCallback(async (drive) => {
    setConnectivity((prev) => ({ ...prev, [drive.id]: 'checking' }))
    try {
      const res = await GoogleDriveApi.get(drive.id)
      setConnectivity((prev) => ({ ...prev, [drive.id]: res ? 'online' : 'unknown' }))
      notify.success(`${drive.name} : connectivité OK.`)
    } catch {
      setConnectivity((prev) => ({ ...prev, [drive.id]: 'offline' }))
      notify.error(`${drive.name} : hors ligne.`)
    }
  }, [notify])

  if (loading) return <LoadingScreen label="Chargement des drives…" />
  if (error) return <div className="ax-container"><PageHeader title="Stockage" subtitle="Administration des drives" /><div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div></div>

  const storage = computeStorageStats(drives)

  return (
    <div className="ax-container">
      <PageHeader title="Stockage Google Drive" subtitle={`${drives.length} drive(s) — administration seule`} actions={<Button variant="ghost" size="sm" onClick={() => load()}>Actualiser</Button>} />

      <AdminSection title="Statistiques globales" description="Agrégation en lecture seule">
        <div className="ax-admin-stats-row">
          <span className="ax-admin-stat"><strong>{storage.activeCount}</strong> actifs</span>
          <span className="ax-admin-stat"><strong>{formatBytes(storage.totalUsed)}</strong> utilisés</span>
          <span className="ax-admin-stat"><strong>{formatBytes(storage.totalLimit)}</strong> capacité</span>
          <span className="ax-admin-stat"><strong>{storage.usagePercent != null ? `${storage.usagePercent}%` : '—'}</strong> taux d’occupation</span>
        </div>
        {storage.usagePercent != null && (
          <div className="ax-progress" role="progressbar" aria-valuenow={storage.usagePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Occupation globale">
            <div className="ax-progress__fill" style={{ width: `${storage.usagePercent}%` }} />
          </div>
        )}
      </AdminSection>

      <div className="ax-admin-drive-grid">
        {drives.length === 0 ? <p className="ax-text--muted">Aucun drive configuré.</p> : drives.map((drive) => (
          <div key={drive.id} className="ax-card ax-card--padded ax-admin-drive-card">
            <div className="ax-admin-drive-card__head">
              <h3 className="ax-admin-drive-card__title">{drive.name}</h3>
              <span className="ax-admin-drive-card__badges">
                <Badge variant={HEALTH_VARIANT[drive.health_status] || 'default'} size="sm">{drive.health_status || 'unknown'}</Badge>
                {drive.is_default && <Badge variant="primary" size="sm">Défaut</Badge>}
                <Badge variant={drive.status ? 'success' : 'default'} size="sm">{drive.status ? 'Actif' : 'Inactif'}</Badge>
                {connectivity[drive.id] && <Badge variant={connectivity[drive.id] === 'online' ? 'success' : connectivity[drive.id] === 'offline' ? 'danger' : 'warning'} size="sm">{connectivity[drive.id]}</Badge>}
              </span>
            </div>
            <dl className="ax-definition-list ax-definition-list--compact">
              <dt>Priorité</dt><dd>{drive.priority ?? '—'}</dd>
              <dt>Usage</dt><dd>{formatBytes(drive.used_storage)} / {formatBytes(drive.storage_limit)} — {formatBytes(drive.available_storage)} disponibles</dd>
              <dt>Uploads</dt><dd>{drive.upload_count ?? '—'}</dd>
              <dt>Dernière synchro</dt><dd>{drive.last_sync_at ? new Date(drive.last_sync_at).toLocaleString('fr-FR') : '—'}</dd>
              <dt>Email</dt><dd className="ax-text--mono">{drive.email || '—'}</dd>
              <dt>Type</dt><dd>{drive.type || '—'}</dd>
            </dl>
            <div className="ax-admin-drive-card__actions">
              <Button variant="outline" size="sm" loading={syncing === drive.id} onClick={() => handleSync(drive)}>Synchroniser</Button>
              <Button variant="ghost" size="sm" onClick={() => handleConnectivity(drive)}>Tester connectivité</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}