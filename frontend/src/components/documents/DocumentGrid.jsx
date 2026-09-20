/**
 * ALPHIX V2 — DocumentGrid
 * Grille responsive (mobile-first) de cartes documents.
 */

import DocumentCard from './DocumentCard'

/**
 * @param {object} props
 * @param {Array<object>} props.documents - Documents a afficher.
 * @param {(id: number|string) => void} [props.onDownloaded] - Callback post-telechargement.
 * @param {() => void} [props.onDocumentOpen] - Callback lorsqu'un document est ouvert (fermeture recherche).
 * @returns {import('react').JSX.Element}
 */
export default function DocumentGrid({ documents, onDownloaded, onDocumentOpen }) {
  return (
    <div className="ax-doc-grid" role="list" aria-label="Documents">
      {documents.map((doc) => (
        <div role="listitem" key={doc.id} onClick={onDocumentOpen}>
          <DocumentCard document={doc} onDownloaded={onDownloaded} />
        </div>
      ))}
    </div>
  )
}