/**
 * ALPHIX V2 — DocumentTable
 * Vue tableau dense (desktop) : titre, type, statut, stats, actions.
 */

import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import { ROUTE_PATHS } from '../../constants/routes'
import { docTypeLabel, docStatusMeta, formatFileSize } from '../../utils/document'
import DownloadButton from './DownloadButton'

/**
 * @param {object} props
 * @param {Array<object>} props.documents - Documents a afficher.
 * @param {(id: number|string) => void} [props.onDownloaded] - Callback post-telechargement.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentTable({ documents, onDownloaded }) {
  return (
    <div className="ax-table-wrap">
      <table className="ax-table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Type</th>
            <th>Taille</th>
            <th>Vues</th>
            <th>Telech.</th>
            <th className="ax-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const status = docStatusMeta(doc.status)
            return (
              <tr key={doc.id}>
                <td className="ax-table__cell--strong">
                  <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}`}>{doc.title || '-'}</Link>
                </td>
                <td><Badge variant="primary" size="sm">{docTypeLabel(doc.doc_type)}</Badge></td>
                <td>{formatFileSize(doc.file_size)}</td>
                <td>
                  <Badge variant="default" size="sm">{doc.views_count ?? 0}</Badge>
                </td>
                <td>
                  <Badge variant="default" size="sm">{doc.downloads_count ?? 0}</Badge>
                </td>
                <td className="ax-table__cell--actions">
                  <span style={{ display: 'inline-flex', gap: 'var(--ax-space-2)' }}>
                    <Badge variant={status.badge} size="sm">{status.label}</Badge>
                    <DownloadButton documentId={doc.id} label="" onDownloaded={onDownloaded} />
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}