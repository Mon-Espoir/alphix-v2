/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Barre de recherche Administration
 * ---------------------------------------------------------------------------
 */

export default function AdminSearchBar({ value, onChange, placeholder = 'Rechercher…', label = 'Rechercher' }) {
  return (
    <div className="ax-admin-search">
      <label className="ax-admin-search__label" htmlFor="admin-search-input">
        {label}
      </label>
      <input
        id="admin-search-input"
        type="search"
        className="ax-input ax-admin-search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  )
}
