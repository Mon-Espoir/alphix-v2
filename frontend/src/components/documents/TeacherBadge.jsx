/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — TeacherBadge (enseignant titulaire + profil UB)
 * ---------------------------------------------------------------------------
 * Bloc réutilisable affiché sous le titre d'un cours : badge bien visible
 * « Enseignant titulaire : <nom> » et, si l'URL du profil UB est connue
 * (description « Profil UB : https://… »), bouton d'action
 * « Voir le profil & syllabus de l'enseignant ».
 * Ouverture : navigateur natif sur mobile (@capacitor/browser), nouvel
 * onglet sur web. Rien n'est rendu si aucun enseignant n'est renseigné.
 */

import { useState } from 'react'
import { Badge } from '../ui'
import { useNotification } from '../../hooks/useNotification'
import { isNativePlatform, openNative } from '../../utils/nativeDownload'
import { resolveTeacherProfileUrl } from '../../utils/document'

/**
 * @param {object} props
 * @param {object|null} props.course - Cours API (teacher, description).
 * @param {'sm'|'md'} [props.size] - Taille des contrôles.
 * @returns {import('react').JSX.Element | null}
 */
export default function TeacherBadge({ course, size = 'sm' }) {
  const notify = useNotification()
  const [opening, setOpening] = useState(false)

  const teacher = String(course?.teacher || '').trim()
  if (!teacher) return null

  const profileUrl = resolveTeacherProfileUrl(course)

  const openProfile = async () => {
    if (!profileUrl) return
    setOpening(true)
    try {
      // Natif (Capacitor) : navigateur système intégré ; web : nouvel onglet.
      if (isNativePlatform()) {
        await openNative(profileUrl)
      } else {
        window.open(profileUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      notify.error("Ouverture du profil impossible. Réessayez.")
    } finally {
      setOpening(false)
    }
  }

  return (
    <div
      className="ax-teacher-badge"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}
      aria-label={`Enseignant titulaire : ${teacher}`}
    >
      <Badge variant="primary" size={size}>
        <span aria-hidden="true">👨‍🏫</span> Enseignant titulaire : {teacher}
      </Badge>
      {profileUrl && (
        <button
          type="button"
          className={`ax-btn ax-btn--secondary ax-btn--${size}`}
          onClick={openProfile}
          disabled={opening}
          aria-label={`Voir le profil et syllabus de ${teacher} (lien externe)`}
        >
          <span aria-hidden="true">🎓</span>{' '}
          {opening ? 'Ouverture...' : "Voir le profil & syllabus de l'enseignant"}
        </button>
      )}
    </div>
  )
}
