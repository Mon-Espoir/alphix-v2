/**
 * ALPHIX V2 — UploadProgress
 * Barre de progression accessible (role progressbar WAI-ARIA) avec vitesse,
 * ETA et label de phase. Animations desactivees sous prefers-reduced-motion.
 */

import { formatBytes, formatSpeed, formatDuration, clampPercent } from '../../utils/upload'

/**
 * @param {object} props
 * @param {number} props.value - Progression 0-100.
 * @param {string} [props.label] - Libelle principal (nom du fichier).
 * @param {string} [props.phaseLabel] - Phase courante (hachage, transfert...).
 * @param {number|null} [props.speed] - Vitesse en octets/s.
 * @param {number|null} [props.etaMs] - Temps restant estime (ms).
 * @param {number|null} [props.bytesLoaded] - Octets traites.
 * @param {number|null} [props.totalBytes] - Taille totale.
 * @param {'primary'|'success'|'danger'} [props.variant='primary'] - Couleur de la barre.
 * @param {boolean} [props.showDetails=true] - Affiche vitesse / ETA / octets.
 */
export default function UploadProgress({
  value,
  label,
  phaseLabel,
  speed = null,
  etaMs = null,
  bytesLoaded = null,
  totalBytes = null,
  variant = 'primary',
  showDetails = true,
}) {
  const percent = clampPercent(value)
  const ariaId = `ax-upload-progress-${label ?? 'bar'}-${percent}`

  return (
    <div className="ax-upload-progress">
      {(label || phaseLabel) && (
        <div className="ax-upload-progress__head">
          {label && <span className="ax-upload-progress__label" title={label}>{label}</span>}
          {phaseLabel && (
            <span className="ax-upload-progress__phase" aria-hidden="true">{phaseLabel}</span>
          )}
        </div>
      )}

      <div
        className="ax-upload-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label ? `Progression : ${label}` : 'Progression'}
      >
        <div
          className={[
            'ax-upload-progress__fill',
            `ax-upload-progress__fill--${variant}`,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ width: `${percent}%` }}
        />
        <span className="ax-visually-hidden">{`${percent} %`}</span>
      </div>

      {showDetails && (
        <p id={`${ariaId}-details`} className="ax-upload-progress__details">
          <span>{percent} %</span>
          {bytesLoaded != null && totalBytes != null && totalBytes > 0 && (
            <span>
              {formatBytes(bytesLoaded)} / {formatBytes(totalBytes)}
            </span>
          )}
          {speed != null && speed > 0 && <span>{formatSpeed(speed)}</span>}
          {etaMs != null && etaMs > 0 && <span>reste {formatDuration(etaMs)}</span>}
        </p>
      )}
    </div>
  )
}
