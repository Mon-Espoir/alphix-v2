/**
 * ALPHIX V2 — DownloadButton
 * Declenche un telechargement : incremente le compteur public Laravel puis
 * notifie le parent (rafraichissement des statistiques).
 */

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { DocumentApi } from '../../api/DocumentApi'
import { resolveDownloadUrl } from '../../utils/document'
import { useAuth } from '../../hooks/useAuth'
import { useNotification } from '../../hooks/useNotification'
import { recordDailyDownload } from '../../utils/gamification'
import { ROUTE_PATHS } from '../../constants/routes'
import { isNativePlatform, downloadNative, openNative } from '../../utils/nativeDownload'

/**
 * @param {object} props
 * @param {number|string} [props.documentId] - Identifiant du document.
 * @param {object|null} [props.document] - Document API complet (pour l'URL reelle).
 * @param {string} [props.label] - Libelle du bouton.
 * @param {'sm'|'md'|'lg'} [props.size] - Taille Button.
 * @param {(documentId: number|string) => void} [props.onDownloaded] - Callback post-increment.
 * @returns {import('react').JSX.Element}
 */
export default function DownloadButton({ documentId, document: doc, label = 'Telecharger', size = 'sm', onDownloaded }) {
  const [isBusy, setIsBusy] = useState(false)
  const { isAuthenticated } = useAuth()
  const notify = useNotification()
  const navigate = useNavigate()
  const location = useLocation()

  const handleClick = async () => {
    // Protection invite : telechargement reserve aux comptes connectes.
    if (!isAuthenticated) {
      notify.warning('Connectez-vous pour telecharger ce document.')
      navigate(ROUTE_PATHS.LOGIN, { replace: false, state: { from: location } })
      return
    }
    setIsBusy(true)
    try {
      const url = resolveDownloadUrl(doc)
      if (!url) {
        notify.warning('Aucun fichier disponible pour ce document.')
        return
      }
      // Natif (Capacitor Android/iOS) : sauvegarde directe dans Documents/ALPHIX.
      if (isNativePlatform()) {
        try {
          const fileName = doc?.original_name || doc?.title || `document-${documentId ?? doc?.id}`
          const { uri } = await downloadNative(url, fileName)
          notify.success('Document enregistré dans Documents/ALPHIX.')
          try {
            await openNative(uri.startsWith('http') ? uri : url)
          } catch { /* aperçu optionnel : fichier déjà sauvegardé */ }
        } catch (nativeError) {
          notify.error(nativeError?.message || 'Échec du téléchargement sur cet appareil.')
          return
        }
      } else {
        // Web : ouverture classique dans un nouvel onglet.
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      // Compteur de telechargements (statistiques).
      await DocumentApi.incrementDownload(documentId ?? doc?.id)
      // Reciprocite : prompt motivant aux paliers 3-4 telechargements/jour.
      recordDailyDownload()
      if (onDownloaded) onDownloaded(documentId ?? doc?.id)
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
      aria-label={`Telecharger le document ${documentId ?? doc?.id}`}
    >
      ⬇ {label}
    </Button>
  )
}