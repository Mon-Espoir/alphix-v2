/**
 * ALPHIX V2 — StorageCard
 * Carte de jauge de stockage (utilise / limite / disponible) avec barre de progression
 * et pourcentage. Accessible, responsive, themable.
 */

import Badge from '../ui/Badge'
import { formatBytes } from '../../utils/upload'

/**
 * @param {object} props
 * @param {number|null} props.usedBytes - Octets utilises.
 * @param {number|null} props.limitBytes - Limite totale (null = illimite).
 * @param {number|null} props.availableBytes - Disponible.
 * @param {string} [props.label='Stockage'] - Titre de la carte.
 * @param {string} [props.className] - Classe additionnelle.
 */
export default function StorageCard({
  usedBytes,
  limitBytes,
  availableBytes,
  label = 'Stockage',
  className = '',
}) {
  const used = Number(usedBytes) || 0
  const limit = Number.isFinite(limitBytes) && limitBytes > 0 ? Number(limitBytes) : null
  const available = Number.isFinite(availableBytes) ? Number(availableBytes) : null

  const hasLimit = limit !== null
  const ratio = hasLimit && limit > 0 ? Math.min(1, used / limit) : 0
  const percent = Math.round(ratio * 100)

  // Variante de badge selon occupation
  let usageVariant = 'success'
  if (ratio >= 0.95) usageVariant = 'danger'
  else if (ratio >= 0.8) usageVariant = 'warning'

  return (
    <div className={['ax-storage-card', className].filter(Boolean).join(' ')}>
      <div className="ax-storage-card__header">
        <h3 className="ax-storage-card__title">{label}</h3>
        {hasLimit && (
          <Badge variant={usageVariant} size="sm">
            {percent}%
          </Badge>
        )}
      </div>

      <div className="ax-storage-card__gauge" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`Occupation ${label}`}>
        <div className={['ax-storage-card__bar', usageVariant !== 'success' && `ax-storage-card__bar--${usageVariant}`].filter(Boolean).join(' ')} style={{ width: `${percent}%` }} />
        <span className="ax-visually-hidden">{`${percent} % utilise`}</span>
      </div>

      <dl className="ax-storage-card__stats">
        <div className="ax-storage-card__stat">
          <dt>Utilise</dt>
          <dd>{formatBytes(used)}</dd>
        </div>
        {hasLimit && (
          <div className="ax-storage-card__stat">
            <dt>Total</dt>
            <dd>{formatBytes(limit)}</dd>
          </div>
        )}
        {available != null && available >= 0 && (
          <div className="ax-storage-card__stat">
            <dt>Disponible</dt>
            <dd>{formatBytes(available)}</dd>
          </div>
        )}
        {!hasLimit && (
          <div className="ax-storage-card__stat ax-storage-card__stat--unlimited">
            <dd>Illimite</dd>
          </div>
        )}
      </dl>
    </div>
  )
}