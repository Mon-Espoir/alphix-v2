/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Storage Dashboard Page
 * ---------------------------------------------------------------------------
 * Tableau de bord de stockage : statistiques de televersement, capacite
 * globale, drives connectes avec synchronisation, drive cible.
 */

/* eslint-disable react-hooks/set-state-in-effect -- chargement initial + refresh intentionnels */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { AutomationApi } from '../../api/AutomationApi'
import { DocumentApi } from '../../api/DocumentApi'
import { normalizeApiList } from '../../utils/academic'
import { hasAdminAccess } from '../../utils/admin'
import { selectTargetDrive, aggregateStorage } from '../../utils/drive'
import { formatBytes } from '../../utils/upload'
import { Container, Button, LoadingSpinner, StatCard } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import AdminSection from '../../components/admin/AdminSection'
import {
  StorageStatistics,
  DriveSelector,
  StorageCard,
  GoogleDriveCard,
} from '../../components/upload'
import { useUploadQueue } from '../../hooks/useUploadQueue'
import { useNotification } from '../../hooks/useNotification'
import { useAuth } from '../../hooks/useAuth'
import { ROUTE_PATHS } from '../../constants/routes'

/**
 * Page tableau de bord stockage.
 * @returns {import('react').JSX.Element}
 */
export default function StorageDashboardPage() {
  const { queue } = useUploadQueue()
  // Fonctions stables (useCallback) : evitent la boucle refetch -> render -> refetch.
  const { error: notifyError, success: notifySuccess } = useNotification()
  const { user } = useAuth()
  // Actions sensibles (defaut, priorite, sync, statut) reservees aux admins.
  const isAdmin = hasAdminAccess(user)
  const [drives, setDrives] = useState([])
  const [documents, setDocuments] = useState([])
  const [targetDriveId, setTargetDriveId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncingId, setSyncingId] = useState(null)

  const refresh = useCallback(
    // quiet=true : rafraichissement de fond (intervalle) sans spinner plein ecran.
    async (signal, opts = {}) => {
      if (!opts.quiet) setIsLoading(true)
      try {
        // Donnees reelles : drives (API) + documents (bibliotheque).
        const [drivesRes, docsRes] = await Promise.all([
          GoogleDriveApi.getActiveByPriority().catch(() => []),
          DocumentApi.list({ per_page: 100 }).catch(() => ({ data: [] })),
        ])
        if (signal?.aborted) return
        setDrives(normalizeApiList(drivesRes))
        setDocuments(normalizeApiList(docsRes))
      } catch {
        if (!signal?.aborted) notifyError('Impossible de charger les drives.')
      } finally {
        if (!signal?.aborted) setIsLoading(false)
      }
    },
    [notifyError],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    refresh(ctrl.signal)
    const interval = setInterval(() => refresh(null, { quiet: true }), 30000)
    return () => {
      ctrl.abort()
      clearInterval(interval)
    }
  }, [refresh])

  const preferredDrive = drives.length > 0 ? selectTargetDrive(drives) : null
  const effectiveTargetId = targetDriveId ?? preferredDrive?.id ?? null

  const handleSync = useCallback(
    async (driveId) => {
      setSyncingId(driveId)
      try {
        await AutomationApi.synchronizeDrive(driveId)
        notifySuccess('Synchronisation terminee.')
        await refresh(null, { quiet: true })
      } catch {
        notifyError('Echec de la synchronisation.')
      } finally {
        setSyncingId(null)
      }
    },
    [notifyError, notifySuccess, refresh],
  )

  const handleSetDefault = useCallback(
    async (driveId) => {
      try {
        await GoogleDriveApi.patch(driveId, { is_default: true })
        notifySuccess('Drive defini par defaut.')
        await refresh(null, { quiet: true })
      } catch {
        notifyError('Impossible de definir le drive par defaut.')
      }
    },
    [notifyError, notifySuccess, refresh],
  )

  const handleToggleStatus = useCallback(
    async (driveId, nextStatus) => {
      try {
        await GoogleDriveApi.patch(driveId, { is_active: nextStatus })
        notifySuccess(nextStatus ? 'Drive active.' : 'Drive desactive.')
        await refresh(null, { quiet: true })
      } catch {
        notifyError('Echec du changement de statut.')
      }
    },
    [notifyError, notifySuccess, refresh],
  )

  const handlePriorityChange = useCallback(
    async (driveId, priority) => {
      try {
        await GoogleDriveApi.patch(driveId, { priority })
        await refresh(null, { quiet: true })
      } catch {
        notifyError('Echec du changement de priorite.')
      }
    },
    [notifyError, refresh],
  )

  const storage = aggregateStorage(drives)

  // Statistiques reelles de la bibliotheque (documents API, pas la session locale).
  const library = useMemo(() => {
    const list = Array.isArray(documents) ? documents : []
    const todayKey = new Date().toISOString().slice(0, 10)
    let bytes = 0
    let today = 0
    for (const doc of list) {
      bytes += Number(doc?.file_size) || 0
      if (String(doc?.created_at || '').slice(0, 10) === todayKey) today += 1
    }
    return { count: list.length, bytes, today }
  }, [documents])

  const neverSynced = drives.filter((d) => !d.last_sync_at).length

  return (
    <Container>
      <PageHeader
        title={isAdmin ? 'Tableau de bord stockage' : 'Espace documentaire'}
        subtitle={isAdmin
          ? "Vue d'ensemble de la flotte Google Drive"
          : 'Disponibilité de la bibliothèque — vos téléversements passent par le drive par défaut'}
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
      {!isAdmin && (
        <p className="ax-text--muted ax-text--sm" style={{ marginBottom: 'var(--ax-space-4)' }}>
          Affichage en lecture seule : la gestion des drives (priorités, synchronisation, activation) est réservée aux administrateurs
          {' '}(<Link to={ROUTE_PATHS.ADMIN_STORAGE} className="ax-link">Administration → Stockage</Link>).
        </p>
      )}

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
          {/* 1. Etat reel de la bibliotheque (documents API) */}
          <AdminSection title="Bibliothèque — état réel" description="Compteurs calculés depuis les documents enregistrés">
            <div className="ax-automation-grid">
              <StatCard label="Documents enregistrés" value={String(library.count)} icon={<span aria-hidden="true">📄</span>} />
              <StatCard label="Volume total" value={formatBytes(library.bytes)} icon={<span aria-hidden="true">💾</span>} />
              <StatCard label="Ajoutés aujourd'hui" value={String(library.today)} icon={<span aria-hidden="true">📥</span>} />
            </div>
            <div style={{ marginTop: 'var(--ax-space-4)' }}>
              <StorageCard
                usedBytes={storage.totalUsed}
                limitBytes={storage.hasCapacityData ? storage.totalLimit : null}
                availableBytes={storage.hasCapacityData ? storage.totalAvailable : null}
                label={isAdmin ? 'Stockage global (drives)' : 'Espace bibliothèque disponible'}
              />
            </div>
            {isAdmin && (
              <div className="ax-storage-dashboard__selector" style={{ marginTop: 'var(--ax-space-4)' }}>
                <DriveSelector
                  drives={drives}
                  value={effectiveTargetId}
                  onChange={setTargetDriveId}
                  label="Drive cible pour les envois"
                />
              </div>
            )}
          </AdminSection>

          {/* 2. Drives (lecture pour tous, gestion admin) */}
          <AdminSection
            title={isAdmin ? `Drives connectes (${drives.length})` : `Espaces disponibles (${drives.length})`}
            description={isAdmin ? 'Santé et occupation en temps réel (API)' : 'État des espaces de la bibliothèque'}
          >
            {neverSynced > 0 && (
              <p className="ax-text--muted ax-text--sm" style={{ marginBottom: 'var(--ax-space-3)' }}>
                {neverSynced} drive{neverSynced > 1 ? 's' : ''} n&apos;a jamais été synchronisé — ses compteurs
                démarreront après la première synchronisation.
              </p>
            )}
            {drives.length === 0 ? (
              <div className="ax-empty-state">
                <p className="ax-empty-state__title">Aucun drive actif</p>
                <p className="ax-empty-state__desc">
                  {isAdmin
                    ? 'Activez un drive depuis la page Gestion des drives.'
                    : "La bibliothèque est momentanément indisponible. Réessayez plus tard ou contactez un administrateur."}
                </p>
              </div>
            ) : (
              <div className="ax-drive-grid">
                {drives.map((drive) => (
                  <GoogleDriveCard
                    key={drive.id}
                    drive={drive}
                    isSyncing={syncingId === drive.id}
                    onSetDefault={isAdmin ? handleSetDefault : undefined}
                    onSync={isAdmin ? handleSync : undefined}
                    onPriorityChange={isAdmin ? handlePriorityChange : undefined}
                    onToggleStatus={isAdmin ? handleToggleStatus : undefined}
                  />
                ))}
              </div>
            )}
            {isAdmin && (
              <div className="ax-automation-actions" style={{ marginTop: 'var(--ax-space-4)' }}>
                <Link to={ROUTE_PATHS.STORAGE_DRIVES} className="ax-btn ax-btn--outline ax-btn--sm">
                  Gérer les drives
                </Link>
                <Link to={ROUTE_PATHS.ADMIN_STORAGE} className="ax-btn ax-btn--ghost ax-btn--sm">
                  Administration → Stockage
                </Link>
              </div>
            )}
          </AdminSection>

          {/* 3. Activite locale de cet appareil (secondaire, session uniquement) */}
          <AdminSection
            title="Mon activité sur cet appareil"
            description="File de téléversement locale de cette session — pas la bibliothèque globale"
          >
            <StorageStatistics
              stats={queue.stats}
              drives={drives}
              history={queue.items}
              days={7}
            />
            <div className="ax-automation-actions" style={{ marginTop: 'var(--ax-space-3)' }}>
              <Link to={ROUTE_PATHS.UPLOAD} className="ax-btn ax-btn--primary ax-btn--sm">
                Aller au téléversement
              </Link>
              <Link to={ROUTE_PATHS.DOCUMENTS} className="ax-btn ax-btn--ghost ax-btn--sm">
                Explorer la bibliothèque
              </Link>
            </div>
          </AdminSection>
        </>
      )}
    </Container>
  )
}
