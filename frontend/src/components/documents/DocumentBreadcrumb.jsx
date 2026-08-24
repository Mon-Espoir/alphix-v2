/**
 * ALPHIX V2 — DocumentBreadcrumb
 * Fil d'Ariane dynamique : Faculte > Departement > Niveau > Semestre > Cours > Titre.
 * Navigation clavier + aria (WAI-ARIA breadcrumb pattern).
 */

import { Link } from 'react-router-dom'

/**
 * @param {object} props
 * @param {Array<{label: string, to?: string}>} props.items - Segment ordonne du fil.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentBreadcrumb({ items }) {
  const segments = Array.isArray(items) ? items.filter((item) => item?.label) : []
  return (
    <nav className="ax-breadcrumb" aria-label="Fil d'Ariane">
      <ol className="ax-breadcrumb__list">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          return (
            <li key={`${segment.label}-${index}`} className="ax-breadcrumb__item">
              {isLast ? (
                <span className="ax-breadcrumb__current" aria-current="page">{segment.label}</span>
              ) : segment.to ? (
                <Link className="ax-breadcrumb__link" to={segment.to}>{segment.label}</Link>
              ) : (
                <span>{segment.label}</span>
              )}
              {!isLast && <span className="ax-breadcrumb__sep" aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}