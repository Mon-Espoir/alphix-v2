/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Storage Dashboard Page
 * ---------------------------------------------------------------------------
 * Tableau de bord de stockage : statistiques de televersement, capacite
 * globale, drives connectes avec synchronisation, drive cible.
 */

import { useState, useEffect, useCallback } from 'react'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { AutomationApi } from '../../api/AutomationApi'
import { normalizeApiList } from '../../utils/academic'
import { selectTargetDrive, aggregateStorage } from '../../utils/drive'
import { Container, Button, LoadingSpinner } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import {
  StorageStatistics,
  DriveSelector,
  StorageCard,
  GoogleDriveCard,
} from '../../components/upload'
import { useUploadQueue } from '../../hooks/useUploadQueue'
import { useNotification } from '../../hooks/useNotification'

/**
 * Page tableau de bord stockage.
 * @returns {import('react').JSX.Element}
 */
export default function StorageDashboardPage() {
  const { queue } = useUploadQueue()
  const notify = useNotification()
  const [drives, setDrives] = useState([])
  const [targetDriveId, setTargetDriveId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncingId, setSyncingId] = useState(null)

  const refresh = useCallback(
    () =>
      GoogleDriveApi.getActiveByPriority()
        .then((response) => setDrives(normalizeApiList(response)))
        .catch(() => notify.error('Impossible de charger les drives.'))
        .finally(() => setIsLoading(false)),
    [notify],
  )

  useEffect(() => {
    const interval = setInterval(() => refresh(), 30000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    refresh()
  }, [refresh])

  const preferredDrive = drives.length > 0 ? selectTargetDrive(drives) : null
  const effectiveTargetId = targetDriveId ?? preferredDrive?.id ?? null

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

  const handleSetDefault = useCallback(
    async (driveId) => {
      try {
        await GoogleDriveApi.patch(driveId, { is_default: true })
        notify.success('Drive defini par defaut.')
        await refresh()
      } catch {
        notify.error('Impossible de definir le drive par defaut.')
      }
    },
    [notify, refresh],
  )

  const handleToggleStatus = useCallback(
    async (driveId, nextStatus) => {
      try {
        await GoogleDriveApi.patch(driveId, { is_active: nextStatus })
        notify.success(nextStatus ? 'Drive active.' : 'Drive desactive.')
        await refresh()
      } catch {
        notify.error('Echec du changement de statut.')
      }
    },
    [notify, refresh],
  )

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

  const storage = aggregateStorage(drives)

  return (
    <Container>
      <PageHeader
        title="Tableau de bord stockage"
        subtitle="Vue d'ensemble de la flotte Google Drive"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            Actualiser
          </Button>
        }
      />

      {isLoading && (
        <div className="ax-storage-dashboard__loading" role="status" aria-live="polite">
          <div className="ax-spinner-wrap">
            <LoadingSpinner size="md" />
            <span className="ax-spinner-wrap__label">Chargement de la flotte...</span>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <StorageStatistics
            stats={queue.stats}
            drives={drives}
            history={queue.items}
            days={7}
          />

          <div className="ax-storage-dashboard__overview">
            <div className="ax-storage-dashboard__selector">
              <DriveSelector
                drives={drives}
                value={effectiveTargetId}
                onChange={setTargetDriveId}
                label="Drive cible pour les envois"
              />
            </div>

            <StorageCard
              usedBytes={storage.totalUsed}
              limitBytes={storage.hasCapacityData ? storage.totalLimit : null}
              availableBytes={storage.hasCapacityData ? storage.totalAvailable : null}
              label="Stockage global"
            />
          </div>

          <div style={{ marginTop: 'var(--ax-space-8)' }}>
            <h2 className="ax-section-title">Drives connectes ({drives.length})</h2>
            {drives.length === 0 ? (
              <div className="ax-empty-state">
                <p className="ax-empty-state__title">Aucun drive actif</p>
                <p className="ax-empty-state__desc">
                  Activez un drive depuis la page Gestion des drives.
                </p>
              </div>
            ) : (
              <div className="ax-drive-grid">
                {drives.map((drive) => (
                  <GoogleDriveCard
                    key={drive.id}
                    drive={drive}
                    isSyncing={syncingId === drive.id}
                    onSetDefault={handleSetDefault}
                    onSync={handleSync}
                    onPriorityChange={handlePriorityChange}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Container>
  )
}
