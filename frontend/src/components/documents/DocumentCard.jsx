/**
 * ALPHIX V2 — DocumentCard
 * Carte document : titre, badges type/statut, stats, actions Apercu / Telecharger.
 */

import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { docTypeLabel, docStatusMeta, formatFileSize, formatShortDate } from '../../utils/document'
import DownloadButton from './DownloadButton'
import PreviewButton from './PreviewButton'

/**
 * @param {object} props
 * @param {object} props.document - Document API.
 * @param {(id: number|string) => void} [props.onDownloaded] - Callback post-telechargement.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentCard({ document: doc, onDownloaded }) {
  const status = docStatusMeta(doc.status)
  return (
    <Card className="ax-doc-card">
      <div className="ax-doc-card__head">
        <Badge variant="primary" size="sm">{docTypeLabel(doc.doc_type)}</Badge>
        <Badge variant={status.badge} size="sm">{status.label}</Badge>
      </div>
      <h3 className="ax-doc-card__title">{doc.title || '-'}</h3>
      {doc.description && (
        <p className="ax-doc-card__desc">
          {doc.description.length > 140 ? `${doc.description.slice(0, 140)}…` : doc.description}
        </p>
      )}
      <ul className="ax-doc-card__facts" aria-label="Metadonnees rapides">
        <li>{formatFileSize(doc.file_size)}</li>
        <li>👁 {doc.views_count ?? 0}</li>
        <li>⬇ {doc.downloads_count ?? 0}</li>
        <li>{formatShortDate(doc.created_at)}</li>
      </ul>
      <div className="ax-form-actions ax-doc-card__actions">
        <PreviewButton documentId={doc.id} />
        <DownloadButton documentId={doc.id} onDownloaded={onDownloaded} />
      </div>
    </Card>
  )
}