/**
 * ALPHIX V2 — DocumentMeta
 * Metadonnees techniques d'un document (liste semantique <dl>).
 */

import { formatFileSize, formatShortDate, docTypeLabel, docVisibilityLabel, docStatusMeta } from '../../utils/document'
import { levelForUploadCount } from '../../utils/gamification'
import Badge from '../ui/Badge'

/**
 * @param {object} props
 * @param {object|null} props.document - Document API.
 * @param {object|null} [props.uploader] - Utilisateur uploader (relation si chargee).
 * @param {object|null} [props.currentUser] - Utilisateur connecté (badge si son propre dépôt).
 * @returns {import('react').JSX.Element}
 */
export default function DocumentMeta({ document: doc, uploader, currentUser }) {
  const status = docStatusMeta(doc?.status)
  // Badge de niveau du déposant : compteur connu (relation) ou dépôt perso.
  const uploaderEmail = uploader?.email || doc?.uploader?.email || null
  const isOwnUpload = Boolean(
    currentUser?.email && uploaderEmail
    && String(currentUser.email).toLowerCase() === String(uploaderEmail).toLowerCase(),
  )
  const uploaderCount = isOwnUpload
    ? currentUser?.uploads_count
    : (uploader?.uploads_count ?? doc?.uploader?.uploads_count)
  const uploaderLevel = uploaderCount != null ? levelForUploadCount(uploaderCount) : null
  const ocrLabel = { pending: 'En attente', processing: 'En traitement', completed: 'Terminé', failed: 'Échec' }[doc?.ocr_status] || doc?.ocr_status || '-'
  const rows = [
    { label: 'Type', value: docTypeLabel(doc?.doc_type) },
    { label: 'Nom original', value: doc?.original_name || '-' },
    { label: 'MIME', value: doc?.mime_type || '-' },
    { label: 'Taille', value: formatFileSize(doc?.file_size) },
    { label: 'Pages', value: doc?.pages ?? '-' },
    { label: 'Langue', value: doc?.language || '-' },
    { label: 'Annee academique', value: doc?.academic_year || '-' },
    { label: 'Version', value: doc?.version || '-' },
    { label: 'OCR', value: ocrLabel },
    { label: 'Visibilite', value: docVisibilityLabel(doc?.visibility) },
    { label: 'Statut', value: status.label },
    { label: 'Publie le', value: formatShortDate(doc?.published_at) },
    { label: 'Cree le', value: formatShortDate(doc?.created_at) },
    { label: 'Mis a jour le', value: formatShortDate(doc?.updated_at) },
    {
      label: 'Depose par',
      value: uploader?.name || (doc?.uploader?.name ?? '-'),
      badge: uploaderLevel ? `${uploaderLevel.icon} ${uploaderLevel.label}` : null,
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
              <>
                {row.value}
                {row.badge && (
                  <> <Badge variant="primary" size="sm">{row.badge}</Badge></>
                )}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}