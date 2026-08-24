/**
 * ALPHIX V2 — DocumentToolbar
 * Barre d'outils : bascule cartes/tableau + tri multi-criteres.
 */

/**
 * Options de tri proposees (libelles FR).
 */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus recents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'alpha', label: 'Alphabetique' },
  { value: 'downloads', label: 'Telechargements' },
  { value: 'views', label: 'Vues' },
]

/**
 * @param {object} props
 * @param {'grid'|'table'} props.view - Vue active.
 * @param {(view: 'grid'|'table') => void} props.onViewChange - Changement de vue.
 * @param {string} props.sortBy - Critere actif.
 * @param {(value: string) => void} props.onSortChange - Changement de tri.
 * @param {number} [props.total] - Nombre de resultats affiches.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentToolbar({ view, onViewChange, sortBy, onSortChange, total }) {
  return (
    <div className="ax-doc-toolbar" role="toolbar" aria-label="Outils de la liste de documents">
      <p className="ax-doc-toolbar__count" aria-live="polite">
        {total != null ? `${total} document${total !== 1 ? 's' : ''}` : ''}
      </p>
      <div className="ax-doc-toolbar__controls">
        <label className="ax-doc-toolbar__field">
          <span className="ax-visually-hidden">Trier par</span>
          <select
            className="ax-form-group__input ax-doc-toolbar__select"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="Trier les documents"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="ax-doc-toolbar__views" role="group" aria-label="Mode d'affichage">
          <button
            type="button"
            className={`ax-icon-btn ${view === 'grid' ? 'ax-doc-toolbar__view--active' : ''}`}
            aria-pressed={view === 'grid'}
            aria-label="Affichage en cartes"
            onClick={() => onViewChange('grid')}
          >
            ▦
          </button>
          <button
            type="button"
            className={`ax-icon-btn ${view === 'table' ? 'ax-doc-toolbar__view--active' : ''}`}
            aria-pressed={view === 'table'}
            aria-label="Affichage en tableau"
            onClick={() => onViewChange('table')}
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  )
}