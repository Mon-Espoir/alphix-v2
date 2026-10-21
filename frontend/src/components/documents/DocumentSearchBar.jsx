/**
 * ALPHIX V2 — DocumentSearchBar
 * Recherche instantanee avec suggestions (autocomplete) et soumission clavier.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * @param {object} props
 * @param {string} props.value - Valeur courante.
 * @param {(value: string) => void} props.onChange - Changement de valeur.
 * @param {(value: string) => void} [props.onSubmit] - Soumission (Entree).
 * @param {Array<string>} [props.suggestions] - Suggestions d'autocompletion.
 * @param {string} [props.placeholder] - Placeholder du champ.
 * @returns {import('react').JSX.Element}
 */
function DocumentSearchBar({
  value,
  onChange,
  onSubmit,
  suggestions = [],
  placeholder = 'Rechercher un document...',
}) {
  const listId = 'document-search-suggestions'
  // Filtrage mémoïsé : évite de re-filtrer les suggestions à chaque frappe.
  const matches = useMemo(() => (
    value.trim()
      ? suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
      : []
  ), [suggestions, value])

  // Ménage d'ouverture du menu : fermé dès qu'on quitte le champ ou qu'on soumet,
  // rouvert uniquement en re-tapant. Évite tout recouvrement des résultats.
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const closeTimer = useRef(null)
  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const requestClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }, [cancelClose])

  useEffect(() => () => cancelClose(), [cancelClose])

  const closeMenu = useCallback(() => {
    cancelClose()
    setOpen(false)
    setHighlightIndex(-1)
  }, [cancelClose])

  const showSuggestions = open && matches.length > 0

  const selectSuggestion = useCallback((suggestion) => {
    closeMenu()
    onChange(suggestion)
    if (onSubmit) onSubmit(suggestion)
  }, [closeMenu, onChange, onSubmit])

  const handleInputChange = useCallback((event) => {
    setOpen(true)
    setHighlightIndex(-1)
    onChange(event.target.value)
  }, [onChange])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowDown' && showSuggestions) {
      event.preventDefault()
      setHighlightIndex((i) => (i + 1) % matches.length)
    } else if (event.key === 'ArrowUp' && showSuggestions) {
      event.preventDefault()
      setHighlightIndex((i) => (i <= 0 ? matches.length - 1 : i - 1))
    } else if (event.key === 'Escape') {
      if (showSuggestions) event.preventDefault()
      closeMenu()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (showSuggestions && highlightIndex >= 0 && matches[highlightIndex]) {
        selectSuggestion(matches[highlightIndex])
        return
      }
      closeMenu()
      if (onSubmit) onSubmit(value)
    }
  }, [showSuggestions, matches, highlightIndex, closeMenu, selectSuggestion, onSubmit, value])

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
        aria-controls={showSuggestions ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={showSuggestions && highlightIndex >= 0 ? `${listId}-opt-${highlightIndex}` : undefined}
        autoComplete="off"
        onFocus={() => { cancelClose(); setOpen(true) }}
        onBlur={requestClose}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      {showSuggestions && (
        <ul className="ax-doc-suggestions" id={listId} role="listbox" aria-label="Suggestions">
          {matches.map((suggestion, index) => (
            <li key={suggestion}>
              <button
                type="button"
                role="option"
                id={`${listId}-opt-${index}`}
                aria-selected={index === highlightIndex}
                className={index === highlightIndex ? 'ax-doc-suggestions__item--active' : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
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

export default memo(DocumentSearchBar)