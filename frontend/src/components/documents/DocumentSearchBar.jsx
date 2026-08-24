/**
 * ALPHIX V2 — DocumentSearchBar
 * Recherche instantanee avec suggestions (autocomplete) et soumission clavier.
 */

/**
 * @param {object} props
 * @param {string} props.value - Valeur courante.
 * @param {(value: string) => void} props.onChange - Changement de valeur.
 * @param {(value: string) => void} [props.onSubmit] - Soumission (Entree).
 * @param {Array<string>} [props.suggestions] - Suggestions d'autocompletion.
 * @param {string} [props.placeholder] - Placeholder du champ.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentSearchBar({
  value,
  onChange,
  onSubmit,
  suggestions = [],
  placeholder = 'Rechercher un document...',
}) {
  const listId = 'document-search-suggestions'
  const matches = value.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
    : []

  return (
    <div className="ax-search-bar" role="search">
      <span className="ax-search-bar__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" />
          <line x1="13.5" y1="13.5" x2="17" y2="17" />
        </svg>
      </span>
      <input
        className="ax-search-bar__input"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label="Rechercher un document"
        aria-controls={matches.length ? listId : undefined}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onSubmit) {
            event.preventDefault()
            onSubmit(value)
          }
        }}
      />
      {matches.length > 0 && (
        <ul className="ax-doc-suggestions" id={listId} role="listbox" aria-label="Suggestions">
          {matches.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => onChange(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}