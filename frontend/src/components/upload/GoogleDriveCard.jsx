/**
 * ALPHIX V2 — GoogleDriveCard
 * Carte d'un drive Google : sante, priorite, defaut, synchronisation, stockage.
 * Actions : definir par defaut, changer priorite, synchroniser, basculer statut.
 */

import { useCallback } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import StorageCard from './StorageCard'
import { driveHealthBadgeVariant, driveHealthLabel, driveTypeLabel, assessDriveHealth } from '../../utils/drive'

const SYNC_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12a8 8 0 0 1 11.3-7.1M20 12v4h-4" /></svg>
)
const STAR_FILLED_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="M10 2l3 6h6l-4 4 1 6-5-4-5 4 1-6-4-4h6z" /></svg>
)
const ARROW_UP_ICON = (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6v8M6 10l4-4 4 4" /></svg>
)
const ARROW_DOWN_ICON = (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 14v-8M6 10l4 4 4-4" /></svg>
)
const TOGGLE_ON_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="8" /></svg>
)
const TOGGLE_OFF_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="8" /><line x1="5" y1="5" x2="15" y2="15" /></svg>
)

/**
 * @param {object} props
 * @param {object} props.drive - Drive (GoogleDriveResource).
 * @param {boolean} [props.isSyncing=false] - Synchronisation en cours.
 * @param {function(number): Promise<void>} [props.onSetDefault] - Definir par defaut.
 * @param {function(number): Promise<void>} [props.onSync] - Lancer synchronisation.
 * @param {function(number, number): Promise<void>} [props.onPriorityChange] - Changer priorite.
 * @param {function(number, boolean): Promise<void>} [props.onToggleStatus] - Activer/desactiver.
 */
export default function GoogleDriveCard({
  drive,
  isSyncing = false,
  onSetDefault,
  onSync,
  onPriorityChange,
  onToggleStatus,
}) {
  const health = assessDriveHealth(drive)
  const healthVariant = driveHealthBadgeVariant(health)
  const isDefault = Boolean(drive.is_default)
  const isActive = drive.status === true || drive.status === 1

  const handleSetDefault = useCallback(async () => {
    if (!onSetDefault || isDefault) return
    await onSetDefault(drive.id)
  }, [onSetDefault, drive.id, isDefault])

  const handleSync = useCallback(async () => {
    if (!onSync || isSyncing) return
    await onSync(drive.id)
  }, [onSync, drive.id, isSyncing])

  const handlePriorityUp = useCallback(async () => {
    if (!onPriorityChange) return
    await onPriorityChange(drive.id, drive.priority - 1)
  }, [onPriorityChange, drive.id, drive.priority])

  const handlePriorityDown = useCallback(async () => {
    if (!onPriorityChange) return
    await onPriorityChange(drive.id, drive.priority + 1)
  }, [onPriorityChange, drive.id, drive.priority])

  const handleToggleStatus = useCallback(async () => {
    if (!onToggleStatus) return
    await onToggleStatus(drive.id, !isActive)
  }, [onToggleStatus, drive.id, isActive])

  return (
    <article className={['ax-google-drive-card', !isActive && 'ax-google-drive-card--inactive'].filter(Boolean).join(' ')}>
      <div className="ax-google-drive-card__header">
        <div className="ax-google-drive-card__identity">
          <span className="ax-google-drive-card__icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-3.87 0-7-2.47-7-5.5s3.13-5.5 7-5.5 7 2.47 7 5.5-3.13 5.5-7 5.5z" /></svg>
          </span>
          <div>
            <h3 className="ax-google-drive-card__name">{drive.name}</h3>
            <div className="ax-google-drive-card__badges">
              <Badge variant={healthVariant} size="sm">{driveHealthLabel(health)}</Badge>
              <Badge variant="default" size="sm">{driveTypeLabel(drive.type)}</Badge>
              {isDefault && <Badge variant="primary" size="sm">Defaut</Badge>}
            </div>
          </div>
        </div>

        <div className="ax-google-drive-card__priority">
          <span className="ax-google-drive-card__priority-label">Priorite</span>
          <div className="ax-google-drive-card__priority-controls">
            <IconButton
              size="sm"
              variant="ghost"
              onClick={handlePriorityUp}
              disabled={drive.priority <= 1 || isSyncing}
              aria-label="Monter la priorite"
            >
              {ARROW_UP_ICON}
            </IconButton>
            <span className="ax-google-drive-card__priority-value">{drive.priority}</span>
            <IconButton
              size="sm"
              variant="ghost"
              onClick={handlePriorityDown}
              disabled={isSyncing}
              aria-label="Descendre la priorite"
            >
              {ARROW_DOWN_ICON}
            </IconButton>
          </div>
        </div>
      </div>

      <StorageCard
        usedBytes={drive.used_storage}
        limitBytes={drive.storage_limit}
        availableBytes={drive.available_storage}
        label=""
      />

      <div className="ax-google-drive-card__meta">
        <span>
          Email: {drive.email || '—'}
        </span>
        <span>
          Derniere sync: {drive.last_sync_at ? new Date(drive.last_sync_at).toLocaleString('fr-FR') : 'Jamais'}
        </span>
        <span>
          Envois: {drive.upload_count || 0}
        </span>
      </div>

      <div className="ax-google-drive-card__actions">
        <Button
          variant={isDefault ? 'ghost' : 'outline'}
          size="sm"
          onClick={handleSetDefault}
          disabled={isDefault || isSyncing}
        >
          {STAR_FILLED_ICON}
          <span className="ax-btn__content--hidden">{isDefault ? 'Par defaut' : 'Definir par defaut'}</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          loading={isSyncing}
        >
          {SYNC_ICON}
          <span className="ax-btn__content--hidden">Synchroniser</span>
        </Button>

        <IconButton
          variant="ghost"
          size="sm"
          onClick={handleToggleStatus}
          disabled={isSyncing}
          aria-label={isActive ? 'Desactiver' : 'Activer'}
          aria-pressed={isActive}
        >
          {isActive ? TOGGLE_ON_ICON : TOGGLE_OFF_ICON}
        </IconButton>
      </div>
    </article>
  )
}