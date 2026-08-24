/**
 * ALPHIX V2 — DocumentGrid
 * Grille responsive (mobile-first) de cartes documents.
 */

import DocumentCard from './DocumentCard'

/**
 * @param {object} props
 * @param {Array<object>} props.documents - Documents a afficher.
 * @param {(id: number|string) => void} [props.onDownloaded] - Callback post-telechargement.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentGrid({ documents, onDownloaded }) {
  return (
    <div className="ax-doc-grid" role="list" aria-label="Documents">
      {documents.map((doc) => (
        <div role="listitem" key={doc.id}>
          <DocumentCard document={doc} onDownloaded={onDownloaded} />
        </div>
      ))}
    </div>
  )
}