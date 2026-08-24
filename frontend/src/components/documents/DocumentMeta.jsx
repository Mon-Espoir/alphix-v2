/**
 * ALPHIX V2 — DocumentMeta
 * Metadonnees techniques d'un document (liste semantique <dl>).
 */

import { formatFileSize, formatShortDate, docTypeLabel, docVisibilityLabel, docStatusMeta } from '../../utils/document'
import Badge from '../ui/Badge'

/**
 * @param {object} props
 * @param {object|null} props.document - Document API.
 * @param {object|null} [props.uploader] - Utilisateur uploader (relation si chargee).
 * @returns {import('react').JSX.Element}
 */
export default function DocumentMeta({ document: doc, uploader }) {
  const status = docStatusMeta(doc?.status)
  const rows = [
    { label: 'Type', value: docTypeLabel(doc?.doc_type) },
    { label: 'Taille', value: formatFileSize(doc?.file_size) },
    { label: 'Pages', value: doc?.pages ?? '-' },
    { label: 'Langue', value: doc?.language || '-' },
    { label: 'Annee academique', value: doc?.academic_year || '-' },
    { label: 'Version', value: doc?.version || '-' },
    { label: 'Visibilite', value: docVisibilityLabel(doc?.visibility) },
    { label: 'Statut', value: status.label },
    { label: 'Publie le', value: formatShortDate(doc?.published_at) },
    { label: 'Cree le', value: formatShortDate(doc?.created_at) },
    { label: 'Mis a jour le', value: formatShortDate(doc?.updated_at) },
    {
      label: 'Depose par',
      value: uploader?.name || (doc?.uploader?.name ?? '-'),
    },
  ]
  return (
    <dl className="ax-doc-meta">
      {rows.map((row) => (
        <div key={row.label} className="ax-doc-meta__row">
          <dt>{row.label}</dt>
          <dd>
            {row.label === 'Statut' ? (
              <Badge variant={status.badge} size="sm">{row.value}</Badge>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}