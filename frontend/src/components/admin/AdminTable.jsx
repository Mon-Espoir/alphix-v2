/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Table accessible Administration
 * ---------------------------------------------------------------------------
 * Table responsive avec conteneur scroll et pagination intégrée.
 */

import Button from '../ui/Button'

export default function AdminTable({ columns = [], rows = [], caption, pagination, onPageChange, emptyLabel = 'Aucune donnée disponible.' }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="ax-admin-empty" role="status" aria-live="polite">
        <p className="ax-admin-empty__text">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="ax-admin-table-wrap">
      <div className="ax-table-scroll" role="region" aria-label={caption || 'Tableau'} tabIndex={0}>
        <table className="ax-table">
          {caption && <caption className="ax-table__caption">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className="ax-table__th">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.key || idx} className="ax-table__tr">
                {columns.map((col) => (
                  <td key={col.key} className="ax-table__td" data-label={col.label}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <nav className="ax-admin-pagination" aria-label="Pagination">
          <Button
            variant="ghost"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            aria-label="Page précédente"
          >
            Précédent
          </Button>
          <span className="ax-admin-pagination__info" aria-live="polite">
            Page {pagination.page} / {pagination.totalPages} — {pagination.total} résultat{pagination.total > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            aria-label="Page suivante"
          >
            Suivant
          </Button>
        </nav>
      )}
    </div>
  )
}
