/**
 * ALPHIX V2 — UploadHistory
 * Historique filtre par statut avec actions rapides (retry, purge, batch delete).
 * Responsive : tableau desktop / cartes mobile.
 */

import { useCallback, useMemo, useState } from 'react'
import { useNotification } from '../../hooks/useNotification'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import { UPLOAD_ITEM_STATUS, UPLOAD_STATUS_GROUPS, UPLOAD_GROUP_STATUSES, UPLOAD_STATUS_LABELS, UPLOAD_STATUS_BADGES } from '../../constants/upload'
import { formatBytes, formatDuration } from '../../utils/upload'
import ConfirmModal from '../common/ConfirmModal'

const STATUS_ICONS = {
  [UPLOAD_ITEM_STATUS.PENDING]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="8" /></svg>
  ),
  [UPLOAD_ITEM_STATUS.HASHING]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2a6 6 0 0 1 6 6" /></svg>
  ),
  [UPLOAD_ITEM_STATUS.CHECKING]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 10l4 4 6-6" /></svg>
  ),
  [UPLOAD_ITEM_STATUS.AWAITING_DECISION]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 6v4M10 12v.01" /></svg>
  ),
  [UPLOAD_ITEM_STATUS.UPLOADING]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
  ),
  [UPLOAD_ITEM_STATUS.UPLOADED]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 10l4 4 6-6" /></svg>
  ),
  [UPLOAD_ITEM_STATUS.FAILED]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" /></svg>
  ),
  [UPLOAD_ITEM_STATUS.CANCELLED]: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" /></svg>
  ),
}

const DELETE_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 6l8 8M14 6l-8 8" />
  </svg>
)
const RETRY_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12a8 8 0 0 1 11.3-7.1M20 12v4h-4" /></svg>
)

/**
 * @param {object} props
 * @param {object[]} props.items - Elements du ledger (vues).
 * @param {function(string): void} props.onRetry - Reessayer un echec.
 * @param {function(string): void} props.onRemove - Supprimer un element.
 * @param {function(string[]): number} props.onBatchDelete - Suppression par lot.
 * @param {function(string): void} [props.onPurgeStatus] - Purge par statut.
 */
export default function UploadHistory({
  items,
  onRetry,
  onRemove,
  onBatchDelete,
  onPurgeStatus,
}) {
  const notify = useNotification()
  const [filter, setFilter] = useState(UPLOAD_STATUS_GROUPS.ALL)
  const [selection, setSelection] = useState(new Set())
  const [confirmPurge, setConfirmPurge] = useState(null)

  const filteredItems = useMemo(() => {
    if (filter === UPLOAD_STATUS_GROUPS.ALL) return items
    const allowed = UPLOAD_GROUP_STATUSES[filter] ?? []
    return items.filter((item) => allowed.includes(item.status))
  }, [items, filter])

  const selectAll = useCallback(() => {
    if (selection.size === filteredItems.length) {
      setSelection(new Set())
    } else {
      setSelection(new Set(filteredItems.map((i) => i.id)))
    }
  }, [filteredItems, selection.size])

  const toggleSelect = useCallback((id) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBatchDelete = useCallback(() => {
    if (selection.size === 0) return
    setConfirmPurge({ type: 'batch', count: selection.size })
  }, [selection.size])

  const confirmBatchDelete = useCallback(async () => {
    if (!confirmPurge) return
    const count = await onBatchDelete(Array.from(selection))
    notify.success(`${count} entree${count > 1 ? 's' : ''} supprimee${count > 1 ? 's' : ''}.`)
    setSelection(new Set())
    setConfirmPurge(null)
  }, [confirmPurge, onBatchDelete, notify, selection])

  const confirmStatusPurge = useCallback(async () => {
    if (!confirmPurge?.status) return
    await onPurgeStatus(confirmPurge.status)
    notify.success(`File purgees pour ce statut.`)
    setConfirmPurge(null)
  }, [confirmPurge, onPurgeStatus, notify])

  const getBadgeVariant = (status) => UPLOAD_STATUS_BADGES[status] || 'default'
  const getLabel = (status) => UPLOAD_STATUS_LABELS[status] || status

  return (
    <div className="ax-upload-history">
      {/* Filtres par statut */}
      <div className="ax-upload-history__filters" role="tablist" aria-label="Filtres d'historique">
        {Object.entries(UPLOAD_STATUS_GROUPS).map(([key, value]) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            className={[
              'ax-upload-history__filter',
              filter === value ? 'ax-upload-history__filter--active' : '',
            ].join(' ')}
            onClick={() => setFilter(value)}
          >
            {key === 'ALL' ? 'Tout' : key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Barre d'actions contextuelles */}
      {selection.size > 0 && (
        <div className="ax-upload-history__batch-bar" role="status">
          <span>{selection.size} selectionne</span>
          <Button variant="ghost" size="sm" onClick={handleBatchDelete}>
            {DELETE_ICON}
            <span className="ax-btn__content--hidden">Supprimer la selection</span>
          </Button>
        </div>
      )}

      {/* Vue tableau (desktop) */}
      <div className="ax-upload-history__table-wrap" role="region" aria-label="Historique des envois">
        <table className="ax-table ax-upload-history__table">
          <thead>
            <tr>
              <th scope="col">
                {selection.size > 0 || filteredItems.some((i) => i.status === UPLOAD_ITEM_STATUS.FAILED || i.status === UPLOAD_ITEM_STATUS.CANCELLED || i.status === UPLOAD_ITEM_STATUS.UPLOADED) ? (
                  <input
                    type="checkbox"
                    checked={selection.size === filteredItems.length && filteredItems.length > 0}
                    indeterminate={selection.size > 0 && selection.size < filteredItems.length}
                    onChange={selectAll}
                    aria-label="Selectionner tout"
                  />
                ) : null}
              </th>
              <th scope="col">Fichier</th>
              <th scope="col">Taille</th>
              <th scope="col">Statut</th>
              <th scope="col">Progression</th>
              <th scope="col">Duree</th>
              <th scope="col">Resolution</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className={[
                  item.status === UPLOAD_ITEM_STATUS.FAILED ? 'ax-table__row--error' : '',
                  item.status === UPLOAD_ITEM_STATUS.UPLOADED ? 'ax-table__row--success' : '',
                ].join(' ')}
              >
                <td>
                  {item.status === UPLOAD_ITEM_STATUS.FAILED ||
                  item.status === UPLOAD_ITEM_STATUS.CANCELLED ||
                  item.status === UPLOAD_ITEM_STATUS.UPLOADED ? (
                    <input
                      type="checkbox"
                      checked={selection.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Selectionner ${item.name}`}
                    />
                  ) : null}
                </td>
                <td>
                  <div className="ax-upload-history__file">
                    <span className="ax-upload-history__icon" aria-hidden="true">{STATUS_ICONS[item.status] || STATUS_ICONS[UPLOAD_ITEM_STATUS.PENDING]}</span>
                    <span title={item.name}>{item.name}</span>
                    {item.hash && (
                      <span className="ax-upload-history__hash" title={item.hash}>
                        {item.hash.slice(0, 16)}...
                      </span>
                    )}
                  </div>
                </td>
                <td>{formatBytes(item.size)}</td>
                <td>
                  <Badge variant={getBadgeVariant(item.status)} size="sm">
                    {getLabel(item.status)}
                  </Badge>
                </td>
                <td>
                  <div className="ax-upload-history__progress-cell">
                    <div className="ax-upload-history__progress-bar" style={{ width: `${item.progress}%` }} />
                    <span className="ax-visually-hidden">{item.progress}%</span>
                  </div>
                </td>
                <td>{formatDuration(item.durationMs)}</td>
                <td>
                  {item.resolution && (
                    <Badge variant={item.resolution === 'replace' ? 'danger' : 'primary'} size="sm">
                      {item.resolution === 'replace' ? 'Remplace' : item.resolution === 'keep_both' ? 'Revision' : 'Annule'}
                    </Badge>
                  )}
                </td>
                <td>
                  <div className="ax-upload-history__actions">
                    {item.status === UPLOAD_ITEM_STATUS.FAILED && (
                      <IconButton
                        size="sm"
                        onClick={() => onRetry(item.id)}
                        aria-label="Reessayer"
                      >
                        {RETRY_ICON}
                      </IconButton>
                    )}
                    {item.status === UPLOAD_ITEM_STATUS.FAILED ||
                    item.status === UPLOAD_ITEM_STATUS.CANCELLED ||
                    item.status === UPLOAD_ITEM_STATUS.UPLOADED ? (
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemove(item.id)}
                        aria-label="Supprimer"
                      >
                        {DELETE_ICON}
                      </IconButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vue cartes (mobile) */}
      <div className="ax-upload-history__cards" role="list" aria-label="Historique des envois">
        {filteredItems.map((item) => (
          <article key={item.id} className="ax-upload-history__card">
            <div className="ax-upload-history__card-head">
              <label className="ax-upload-history__select-label">
                {item.status === UPLOAD_ITEM_STATUS.FAILED ||
                item.status === UPLOAD_ITEM_STATUS.CANCELLED ||
                item.status === UPLOAD_ITEM_STATUS.UPLOADED ? (
                  <input
                    type="checkbox"
                    checked={selection.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={`Selectionner ${item.name}`}
                  />
                ) : null}
              </label>
              <div className="ax-upload-history__file-info">
                <span className="ax-upload-history__icon" aria-hidden="true">{STATUS_ICONS[item.status] || STATUS_ICONS[UPLOAD_ITEM_STATUS.PENDING]}</span>
                <div>
                  <span className="ax-upload-history__name" title={item.name}>{item.name}</span>
                  <span className="ax-upload-history__meta">{formatBytes(item.size)}</span>
                </div>
              </div>
            </div>
            <div className="ax-upload-history__card-body">
              <div className="ax-upload-history__status-row">
                <Badge variant={getBadgeVariant(item.status)} size="sm">
                  {getLabel(item.status)}
                </Badge>
                {item.attempts > 0 && <Badge variant="warning" size="sm">Tentative {item.attempts}</Badge>}
              </div>
              <div className="ax-upload-history__progress-cell">
                <div className="ax-upload-history__progress-bar" style={{ width: `${item.progress}%` }} />
                <span>{item.progress}%</span>
              </div>
              <div className="ax-upload-history__details">
                <span>Duree: {formatDuration(item.durationMs)}</span>
                {item.resolution && <span>Resolution: {item.resolution === 'replace' ? 'Remplace' : item.resolution === 'keep_both' ? 'Revision' : 'Annule'}</span>}
                {item.error && <span className="ax-upload-history__error">{item.error.message}</span>}
              </div>
              <div className="ax-upload-history__card-actions">
                {item.status === UPLOAD_ITEM_STATUS.FAILED && (
                  <Button variant="primary" size="sm" onClick={() => onRetry(item.id)}>
                    {RETRY_ICON}
                    <span className="ax-btn__content--hidden">Reessayer</span>
                  </Button>
                )}
                {item.status === UPLOAD_ITEM_STATUS.FAILED ||
                item.status === UPLOAD_ITEM_STATUS.CANCELLED ||
                item.status === UPLOAD_ITEM_STATUS.UPLOADED ? (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(item.id)}
                    aria-label="Supprimer"
                  >
                    {DELETE_ICON}
                  </IconButton>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="ax-empty-state" role="status">
          <p className="ax-empty-state__title">Aucun envoi</p>
          <p className="ax-empty-state__desc">
            {filter === UPLOAD_STATUS_GROUPS.ALL
              ? 'La file est vide.'
              : `Aucun envoi avec le statut "${filter}".`}
          </p>
        </div>
      )}

      {/* Modals de confirmation */}
      {confirmPurge?.type === 'batch' && (
        <ConfirmModal
          open={true}
          title="Supprimer la selection"
          message={`Confirmer la suppression de ${confirmPurge.count} entree${confirmPurge.count > 1 ? 's' : ''} ?`}
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={confirmBatchDelete}
          onCancel={() => setConfirmPurge(null)}
        />
      )}
      {confirmPurge?.status && (
        <ConfirmModal
          open={true}
          title="Purger ce statut"
          message={`Supprimer toutes les entrees avec le statut "${confirmPurge.status}" ?`}
          confirmLabel="Purger"
          variant="danger"
          onConfirm={confirmStatusPurge}
          onCancel={() => setConfirmPurge(null)}
        />
      )}
    </div>
  )
}