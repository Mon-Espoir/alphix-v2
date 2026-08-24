/**
 * ALPHIX V2 — DriveSelector
 * Selecteur de drive cible pour les envois, affichant la sante et la capacite.
 * Accessible (native select stylise) et responsive.
 */

import { selectTargetDrive } from '../../utils/drive'
import { formatBytes } from '../../utils/upload'
import { driveHealthBadgeVariant, driveHealthLabel } from '../../utils/drive'

/**
 * @param {object} props
 * @param {object[]|null} props.drives - Drives disponibles (actifs tries par priorite).
 * @param {number|string|null} props.value - ID du drive selectionne.
 * @param {function(number|string|null): void} props.onChange - Changement de selection.
 * @param {string} [props.label='Drive cible'] - Label du champ.
 * @param {string} [props.placeholder='Selectionner un drive'] - Placeholder.
 * @param {boolean} [props.disabled=false] - Desactive.
 * @param {number|null} [props.requiredBytes] - Taille fichier entrant (filtre capacite).
 * @param {string} [props.className] - Classe additionnelle.
 */
export default function DriveSelector({
  drives,
  value,
  onChange,
  label = 'Drive cible',
  placeholder = 'Selectionner un drive',
  disabled = false,
  requiredBytes = null,
  className = '',
}) {
  const ordered = drives
    ? [...drives].sort((a, b) => (a.priority || 99) - (b.priority || 99))
    : []

  const preferred = selectTargetDrive(drives, { requiredBytes })

  return (
    <div className={['ax-drive-selector', className].filter(Boolean).join(' ')}>
      <label className="ax-form-group__label" htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label}
      </label>
      <select
        id={label.toLowerCase().replace(/\s+/g, '-')}
        className="ax-form-group__input ax-drive-selector__select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled || ordered.length === 0}
      >
        <option value="">{placeholder}</option>
        {preferred && !ordered.some((d) => d.id === preferred.id) && (
          <option value={preferred.id} disabled>
            {preferred.name} (recommande, mais non disponible)
          </option>
        )}
        {ordered.map((drive) => {
          const health = driveHealthBadgeVariant(drive.health_status)
          const canAccept = drive.status && health !== 'danger'
          return (
            <option
              key={drive.id}
              value={drive.id}
              disabled={!canAccept}
            >
              {drive.name} — Priorite {drive.priority} —{' '}
              {formatBytes(drive.available_storage || 0)} dispo —{' '}
              {driveHealthLabel(drive.health_status)}
              {drive.is_default ? ' (defaut)' : ''}
            </option>
          )
        })}
      </select>
      {requiredBytes && preferred && (
        <p className="ax-drive-selector__hint">
          Recommandation automatique : <strong>{preferred.name}</strong> ({formatBytes(preferred.available_storage || 0)} disponibles)
        </p>
      )}
    </div>
  )
}