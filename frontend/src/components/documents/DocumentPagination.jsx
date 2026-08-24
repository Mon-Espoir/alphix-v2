/**
 * ALPHIX V2 — DocumentPagination
 * Pagination serveur (metadonnees Laravel) : precedent / suivant + info.
 */

/**
 * @param {object} props
 * @param {number} props.currentPage - Page courante (1-based).
 * @param {number} props.lastPage - Derniere page.
 * @param {number} [props.total] - Nombre total de resultats.
 * @param {(page: number) => void} props.onPageChange - Changement de page.
 * @returns {import('react').JSX.Element|null}
 */
export default function DocumentPagination({ currentPage, lastPage, total, onPageChange }) {
  if (!lastPage || lastPage <= 1) return null
  return (
    <nav className="ax-pagination" aria-label="Pagination des documents">
      <ButtonGhost
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        label="Page precedente"
      >
        ‹ Precedent
      </ButtonGhost>
      <span className="ax-pagination__info">
        Page {currentPage} sur {lastPage}{total != null ? ` (${total} resultats)` : ''}
      </span>
      <ButtonGhost
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange(currentPage + 1)}
        label="Page suivante"
      >
        Suivant ›
      </ButtonGhost>
    </nav>
  )
}

/**
 * Petit bouton fantome interne accessible au clavier.
 * @param {object} props - Props du bouton natif + label aria.
 * @returns {import('react').JSX.Element}
 */
function ButtonGhost({ children, label, ...rest }) {
  return (
    <button type="button" className="ax-icon-btn" aria-label={label} {...rest}>
      {children}
    </button>
  )
}