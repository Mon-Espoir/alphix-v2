/**
 * ---------------------------------------------------------------------------
 * ALPHIX — Administration / Paramètres
 * ---------------------------------------------------------------------------
 * Informations application, configuration stockage, mode maintenance,
 * informations système, version. Lecture seule côté frontend ; actions
 * sensibles désactivées si l'API ne les expose pas.
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import httpService from '../../services/httpService'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { normalizeApiList } from '../../utils/academic'
import PageHeader from '../../components/common/PageHeader'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminSection from '../../components/admin/AdminSection'
import SecondaryAIPanel from '../../components/admin/SecondaryAIPanel'
import AdminBroadcastForm from '../../components/admin/AdminBroadcastForm'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useNotification } from '../../hooks/useNotification'
import { ENV } from '../../config/env'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [drives, setDrives] = useState([])
  const [health, setHealth] = useState(null)
  const [maintenance, setMaintenance] = useState(false)
  const notify = useNotification()

  const load = useCallback(async (signal) => {
    setLoading(true)
    try {
      const [d, maint] = await Promise.all([
        GoogleDriveApi.list().catch(() => ({ data: [] })),
        httpService.get('/maintenance/status', { signal }).catch(() => null),
      ])
      if (signal?.aborted) return
      setDrives(normalizeApiList(d))
      if (maint && typeof maint.enabled === 'boolean') {
        setMaintenance(maint.enabled)
      }
      // Health endpoint optionnel
      try {
        const h = await httpService.get('/health', { signal })
        if (!signal?.aborted) setHealth(h)
      } catch { /* silencieux */ }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const handleToggleMaintenance = useCallback(async () => {
    const next = !maintenance
    try {
      const res = await httpService.post('/maintenance/toggle', { enabled: next })
      const enabled = res?.enabled ?? next
      setMaintenance(enabled)
      notify.success(enabled ? 'Mode maintenance activé côté serveur.' : 'Mode maintenance désactivé.')
    } catch (err) {
      notify.error(err?.message || 'Échec du basculement maintenance.')
    }
  }, [maintenance, notify])

  if (loading) return <LoadingScreen label="Chargement des paramètres…" />

  return (
    <div className="ax-container">
      <PageHeader title="Paramètres système" subtitle="Configuration & informations" />

      <AdminSection title="Informations de l’application" description="Métadonnées">
        <dl className="ax-definition-list">
          <dt>Nom</dt><dd>ALPHIX</dd>
          <dt>Version</dt><dd><Badge variant="primary" size="sm">2.0.0</Badge></dd>
          <dt>Environnement</dt><dd>{ENV.APP_ENV || 'production'}</dd>
          <dt>Base URL API</dt><dd className="ax-text--mono">{ENV.API_BASE_URL || '—'}</dd>
          <dt>Santé serveur</dt><dd>{health ? <Badge variant="success" size="sm">OK</Badge> : <Badge variant="default" size="sm">Inconnue — endpoint /health non exposé</Badge>}</dd>
        </dl>
      </AdminSection>

      <AdminSection title="Configuration stockage" description="Flotte Google Drive (lecture seule)">
        {drives.length === 0 ? <p className="ax-text--muted">Aucun drive configuré.</p> : (
          <ul className="ax-admin-list" role="list">
            {drives.map((d) => (
              <li key={d.id} className="ax-admin-list__item">
                <span>{d.name} — priorité {d.priority} {d.is_default ? '(défaut)' : ''}</span>
                <Badge variant={d.status ? 'success' : 'default'} size="sm">{d.status ? 'Actif' : 'Inactif'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Mode maintenance" description="Basculer l’état de maintenance de la plateforme">
        <div className="ax-admin-maintenance">
          <Badge variant={maintenance ? 'warning' : 'success'} size="md">{maintenance ? 'Activé' : 'Désactivé'}</Badge>
          <Button variant={maintenance ? 'danger' : 'primary'} size="sm" onClick={handleToggleMaintenance}>
            {maintenance ? 'Désactiver la maintenance' : 'Activer la maintenance'}
          </Button>
          <p className="ax-text--muted ax-text--sm">Action persistée côté serveur (visible par tous les admins après rechargement).</p>
        </div>
      </AdminSection>

      <AdminSection title="Informations système" description="Diagnostics">
        <dl className="ax-definition-list">
          <dt>Navigateur</dt><dd className="ax-text--mono">{typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '—'}</dd>
          <dt>Langue</dt><dd>{typeof navigator !== 'undefined' ? navigator.language : '—'}</dd>
          <dt>Fuseau horaire</dt><dd>{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd>
          <dt>Date</dt><dd>{new Date().toLocaleString('fr-FR')}</dd>
        </dl>
      </AdminSection>

      <SecondaryAIPanel />

      <AdminSection title="Diffusion — message broadcast" description="Envoyer un message personnalisé à tous les utilisateurs (titre + contenu)">
        <AdminBroadcastForm />
      </AdminSection>

      <AdminSection title="Version & support">
        <p className="ax-text--muted">ALPHIX — Plateforme académique. Pour toute opération critique, utilisez les journaux système et la page stockage.</p>
        <p><a className="ax-link" href="/admin/logs">Voir les journaux</a> — <a className="ax-link" href="/admin/statistics">Voir les statistiques</a></p>
      </AdminSection>
    </div>
  )
}