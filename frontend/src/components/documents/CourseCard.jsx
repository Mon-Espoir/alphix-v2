/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — CourseCard (carte de cours systématique)
 * ---------------------------------------------------------------------------
 * Une carte par cours, TOUJOURS rendue même sans document associé :
 * nom + code, hiérarchie académique, TeacherBadge (enseignant + profil UB),
 * mention « Aucun document disponible pour le moment » si compteur à 0,
 * actions Voir documents / Ajouter. Utilisée par l'Explorer et la Recherche.
 */

import { Link } from 'react-router-dom'
import { Badge } from '../ui'
import TeacherBadge from './TeacherBadge'
import { semesterLabel } from '../../utils/academic'
import { ROUTE_PATHS } from '../../constants/routes'

/**
 * @param {object} props
 * @param {object} props.course - Cours API (jamais filtré sur les documents).
 * @param {Array<object>} [props.levels] - Niveaux (libellé semestre global).
 * @param {Array<object>} [props.semesters] - Semestres (libellé semestre global).
 * @param {boolean} [props.isAdmin] - Affiche le bouton d'ajout.
 * @param {string} [props.addLabel] - Libellé du bouton d'ajout.
 * @param {(() => void)|null} [props.onSelect] - Clic sur la carte (optionnel).
 * @param {object} [props.style] - Style additionnel du conteneur.
 * @param {object} [props.actionsStyle] - Style additionnel de la rangée d'actions.
 * @returns {import('react').JSX.Element | null}
 */
export default function CourseCard({
  course,
  levels = [],
  semesters = [],
  isAdmin = false,
  addLabel = 'Ajouter un document',
  onSelect = null,
  style = null,
  actionsStyle = null,
}) {
  const count = course?.documents_count ?? course?.total_documents ?? 0
  const facultyName = course?.department?.faculty?.name || ''
  const departmentName = course?.department?.name || ''
  const levelName = course?.level?.name || ''
  const semesterName = semesterLabel(course, { levels, semesters }) || ''

  return (
    <div
      className="ax-card ax-card--padded"
      onClick={onSelect || undefined}
      style={style}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--ax-space-2)', gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
        {course?.code ? (
          <Badge variant="primary" size="sm">{course.code}</Badge>
        ) : <span />}
        <Badge variant={count > 0 ? 'success' : 'default'} size="sm">
          {count} document{count !== 1 ? 's' : ''}
        </Badge>
      </div>
      <h3 style={{ fontSize: 'var(--ax-text-base)', fontWeight: 'var(--ax-font-semibold)', marginBottom: 'var(--ax-space-1)' }}>
        {course?.title || course?.name}
      </h3>
      <p style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-tertiary)', marginBottom: 'var(--ax-space-2)' }}>
        {[facultyName, departmentName, levelName, semesterName].filter(Boolean).join(' • ') || '-'}
      </p>
      {course?.teacher && (
        <div
          style={{ marginBottom: 'var(--ax-space-2)' }}
          onClick={onSelect ? (event) => event.stopPropagation() : undefined}
        >
          <TeacherBadge course={course} size="sm" />
        </div>
      )}
      {count === 0 && (
        <p style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-secondary)', fontStyle: 'italic', margin: '0 0 var(--ax-space-2)' }}>
          Aucun document disponible pour le moment
        </p>
      )}
      <div
        style={{ display: 'flex', gap: 'var(--ax-space-2)', flexWrap: 'wrap', ...actionsStyle }}
        onClick={onSelect ? (event) => event.stopPropagation() : undefined}
      >
        {count > 0 && (
          <Link to={`${ROUTE_PATHS.DOCUMENTS}?course_id=${course.id}`} className="ax-btn ax-btn--ghost ax-btn--sm">
            Voir documents ({count})
          </Link>
        )}
        {isAdmin && (
          <Link to={`${ROUTE_PATHS.DOCUMENTS}/create?course_id=${course.id}`} className="ax-btn ax-btn--primary ax-btn--sm">
            {addLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
