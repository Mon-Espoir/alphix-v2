/**
 * ALPHIX V2 — PreviewButton
 * Navigation vers la visionneuse securisee d'un document.
 */

import Button from '../ui/Button'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../constants/routes'

/**
 * @param {object} props
 * @param {number|string} props.documentId - Identifiant du document.
 * @param {string} [props.label] - Libelle du bouton.
 * @param {'sm'|'md'|'lg'} [props.size] - Taille Button.
 * @returns {import('react').JSX.Element}
 */
export default function PreviewButton({ documentId, label = 'Apercu', size = 'sm' }) {
  const navigate = useNavigate()
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={() => navigate(`${ROUTE_PATHS.DOCUMENTS}/${documentId}/preview`)}
      aria-label={`Apercu du document ${documentId}`}
    >
      👁 {label}
    </Button>
  )
}