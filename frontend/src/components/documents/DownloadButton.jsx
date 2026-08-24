/**
 * ALPHIX V2 — DownloadButton
 * Declenche un telechargement : incremente le compteur public Laravel puis
 * notifie le parent (rafraichissement des statistiques).
 */

import { useState } from 'react'
import Button from '../ui/Button'
import { DocumentApi } from '../../api/DocumentApi'

/**
 * @param {object} props
 * @param {number|string} props.documentId - Identifiant du document.
 * @param {string} [props.label] - Libelle du bouton.
 * @param {'sm'|'md'|'lg'} [props.size] - Taille Button.
 * @param {(documentId: number|string) => void} [props.onDownloaded] - Callback post-increment.
 * @returns {import('react').JSX.Element}
 */
export default function DownloadButton({ documentId, label = 'Telecharger', size = 'sm', onDownloaded }) {
  const [isBusy, setIsBusy] = useState(false)

  const handleClick = async () => {
    setIsBusy(true)
    try {
      await DocumentApi.incrementDownload(documentId)
      if (onDownloaded) onDownloaded(documentId)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      loading={isBusy}
      onClick={handleClick}
      aria-label={`Telecharger le document ${documentId}`}
    >
      ⬇ {label}
    </Button>
  )
}