/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Drive Manager Page
 * ---------------------------------------------------------------------------
 * Gestion complete de la flotte Google Drive : priorites, drive par defaut,
 * synchronisation, sante et connectivite.
 */

import { useState, useEffect, useCallback } from 'react'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { AutomationApi } from '../../api/AutomationApi'
import { normalizeApiList } from '../../utils/academic'
import {
  assessDriveHealth,
  driveHealthBadgeVariant,
  driveHealthLabel,
  driveTypeLabel,
} from '../../utils/drive'
import { formatBytes } from '../../utils/upload'
import { Container, Button, Badge, LoadingSpinner } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import { useNotification } from '../../hooks/useNotification'

/**
 * Page de gestion des drives Google.
 * @returns {import('react').JSX.Element}
 */
export default function DriveManagerPage() {
  const notify = useNotification()
  const [drives, setDrives] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncingId, setSyncingId] = useState(null)
  const [defaultCandidateId, setDefaultCandidateId] = useState(null)

  const refresh = useCallback(
    () =>
      GoogleDriveApi.list()
        .then((response) => setDrives(normalizeApiList(response)))
        .catch(() => notify.error('Impossible de charger les drives.'))
        .finally(() => setIsLoading(false)),
    [notify],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const executeSetDefault = useCallback(async () => {
    if (!defaultCandidateId) return
    try {
      await GoogleDriveApi.patch(defaultCandidateId, { is_default: true })
      notify.success('Drive defini par defaut.')
      await refresh()
    } catch {
      notify.error('Echec de la mise a jour.')
    } finally {
      setDefaultCandidateId(null)
    }
  }, [defaultCandidateId, notify, refresh])

  const handlePriorityChange = useCallback(
    async (driveId, priority) => {
      try {
        await GoogleDriveApi.patch(driveId, { priority })
        await refresh()
      } catch {
        notify.error('Echec du changement de priorite.')
      }
    },
    [notify, refresh],
  )

  const handleSync = useCallback(
    async (driveId) => {
      setSyncingId(driveId)
      try {
        await AutomationApi.synchronizeDrive(driveId)
        notify.success('Synchronisation terminee.')
        await refresh()
      } catch {
        notify.error('Echec de la synchronisation.')
      } finally {
        setSyncingId(null)
      }
    },
    [notify, refresh],
  )

  const handleToggleStatus = useCallback(
    async (driveId, nextStatus) => {
      try {
        await GoogleDriveApi.patch(driveId, { status: nextStatus })
        notify.success(nextStatus ? 'Drive active.' : 'Drive desactive.')
        await refresh()
      } catch {
        notify.error('Echec du changement de statut.')
      }
    },
    [notify, refresh],
  )

  const handleTestConnectivity = useCallback(
    async (drive) => {
      const startedAt = performance.now()
      try {
        await GoogleDriveApi.get(drive.id)
        const latencyMs = Math.round(performance.now() - startedAt)
        notify.success(`Connectivite OK (${latencyMs} ms).`)
      } catch {
        notify.error('Drive injoignable.')
      }
    },
    [notify],
  )

  if (isLoading && drives.length === 0) {
    return (
      <Container>
        <PageHeader
          title="Gestion des drives Google"
          subtitle="Configuration de la flotte de stockage"
        />
        <div className="ax-storage-dashboard__loading" role="status" aria-live="polite">
          <div className="ax-spinner-wrap">
            <LoadingSpinner size="md" />
            <span className="ax-spinner-wrap__label">Chargement des drives...</span>
          </div>
        </div>
      </Container>
    )
  }

  const sorted = [...drives].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  const defaultCandidate = drives.find((d) => d.id === defaultCandidateId)

  return (
    <Container>
      <PageHeader
        title="Gestion des drives Google"
        subtitle="Priorites, drive par defaut, synchronisation et sante"
        actions={
          <Button variant="secondary" size="sm" onClick={() => refresh()} disabled={isLoading}>
            Actualiser
          </Button>
        }
      />

      {drives.length === 0 ? (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun drive configure</p>
          <p className="ax-empty-state__desc">
            Les drives sont provisionnes via la configuration backend (credentials Google).
          </p>
        </div>
      ) : (
        <div className="ax-drive-grid">
          {sorted.map((drive) => {
            const health = assessDriveHealth(drive)
            const healthVariant = driveHealthBadgeVariant(health)
            const isDefault = Boolean(drive.is_default)
            const isActive = Boolean(drive.status)
            const priority = drive.priority ?? 99
            const usagePercent =
              drive.storage_limit > 0
                ? Math.min(100, Math.round(((drive.used_storage ?? 0) / drive.storage_limit) * 100))
                : 0

            return (
              <article
                key={drive.id}
                className={[
                  'ax-drive-manager-card',
                  !isActive && 'ax-drive-manager-card--inactive',
                  isDefault && 'ax-drive-manager-card--default',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="ax-drive-manager-card__header">
                  <div className="ax-drive-manager-card__identity">
                    <span className="ax-drive-manager-card__icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.71 2.5 1.6 13.06l3.05 5.44L10.77 7.9zm8.58 0h-6.1l6.12 10.62 3.05-5.44zM21.4 14.12h-12.1l-3.05 5.44h12.1z" />
                      </svg>
                    </span>
                    <div className="ax-drive-manager-card__titles">
                      <h2 className="ax-drive-manager-card__name">{drive.name}</h2>
                      <div className="ax-drive-manager-card__badges">
                        <Badge variant={healthVariant} size="sm">
                          {driveHealthLabel(health)}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {driveTypeLabel(drive.type)}
                        </Badge>
                        {isDefault && (
                          <Badge variant="primary" size="sm">
                            Defaut
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ax-drive-manager-card__priority">
                    <span className="ax-drive-manager-card__priority-label">Priorite</span>
                    <div className="ax-drive-manager-card__priority-controls">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePriorityChange(drive.id, priority - 1)}
                        disabled={priority <= 1}
                        aria-label={`Monter la priorite de ${drive.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M10 15V5M6 9l4-4 4 4" />
                        </svg>
                      </Button>
                      <span className="ax-drive-manager-card__priority-value">{priority}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePriorityChange(drive.id, priority + 1)}
                        aria-label={`Descendre la priorite de ${drive.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M10 5v10M6 11l4 4 4-4" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>

                <div
                  className="ax-drive-manager-card__storage-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={usagePercent}
                  aria-label={`Occupation du drive ${drive.name}`}
                >
                  <div
                    className={[
                      'ax-drive-manager-card__storage-fill',
                      healthVariant !== 'success' &&
                        `ax-drive-manager-card__storage-fill--${healthVariant}`,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>

                <div className="ax-drive-manager-card__storage-stats">
                  <span>Utilise : {formatBytes(drive.used_storage)}</span>
                  {drive.storage_limit != null && (
                    <>
                      <span>Total : {formatBytes(drive.storage_limit)}</span>
                      <span>Disponible : {formatBytes(drive.available_storage)}</span>
                    </>
                  )}
                </div>

                <div className="ax-drive-manager-card__meta">
                  <span>{drive.email || 'Email non renseigne'}</span>
                  <span>
                    Derniere sync :
                    {' '}
                    {drive.last_sync_at
                      ? new Date(drive.last_sync_at).toLocaleString('fr-FR')
                      : 'Jamais'}
                  </span>
                  <span>Envois : {drive.upload_count ?? 0}</span>
                </div>

                <div className="ax-drive-manager-card__actions">
                  <Button
                    variant={isDefault ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setDefaultCandidateId(drive.id)}
                    disabled={isDefault}
                  >
                    {isDefault ? 'Par defaut' : 'Definir par defaut'}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSync(drive.id)}
                    disabled={syncingId === drive.id}
                  >
                    {syncingId === drive.id ? 'Sync...' : 'Synchroniser'}
                  </Button>

                  <Button variant="ghost" size="sm" onClick={() => handleTestConnectivity(drive)}>
                    Tester la connexion
                  </Button>

                  <Button
                    variant={isActive ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleStatus(drive.id, !isActive)}
                  >
                    {isActive ? 'Desactiver' : 'Activer'}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(defaultCandidate)}
        title="Definir le drive par defaut"
        message={
          defaultCandidate
            ? `« ${defaultCandidate.name} » deviendra la destination principale des televersements. Le drive par defaut actuel perdra ce statut. Continuer ?`
            : ''
        }
        confirmLabel="Definir"
        variant="primary"
        onConfirm={executeSetDefault}
        onCancel={() => setDefaultCandidateId(null)}
      />
    </Container>
  )
}
