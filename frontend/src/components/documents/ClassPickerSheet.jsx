/**
 * ALPHIX V2 — ClassPickerSheet
 * Tiroir bas (bottom sheet) mobile-first : selection directe de classe en 2 etapes.
 * Etape 1 : Faculte -> Departement (Mon Departement).
 * Etape 2 : Niveau (ex : BAC 3).
 * A la validation, applique la cascade via onChange (un patch par maillon).
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { resolveDepartmentFacultyId } from '../../utils/academic'

/**
 * @param {object} props
 * @param {boolean} props.open - Tiroir ouvert.
 * @param {() => void} props.onClose - Fermeture.
 * @param {Array<object>} props.faculties - Facultes (API).
 * @param {Array<object>} props.departments - Departements (API, liste complete).
 * @param {Array<object>} props.levels - Niveaux (API, contexte courant).
 * @param {Array<object>} [props.allLevels] - Niveaux complets (API) : garentit que tous les BAC sont proposes a l'etape 2.
 * @param {object} props.filters - Filtres actifs (pour pre-remplir / resume).
 * @param {(patch: object) => void} props.onChange - Patch de filtres (cascade geree par la page).
 * @returns {import('react').JSX.Element | null}
 */
export default function ClassPickerSheet({
  open,
  onClose,
  faculties = [],
  departments = [],
  levels = [],
  allLevels = [],
  filters,
  onChange,
}) {
  const [step, setStep] = useState(1)
  const [expandedFacultyId, setExpandedFacultyId] = useState('')
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')

  // (Re)initialisation a chaque ouverture depuis les filtres actifs.
  // Pattern "reset state during render" (recommande par React) : evite le
  // setState dans un effet tout en resynchronisant l'etape et la selection.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep(1)
      setSelectedFacultyId(String(filters?.facultyId || ''))
      setSelectedDepartmentId(String(filters?.departmentId || ''))
      setExpandedFacultyId(String(filters?.facultyId || ''))
    }
  }

  // Verrouille le scroll de fond pendant que le tiroir est ouvert.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const departmentsOf = (facultyId) =>
    departments.filter((d) => resolveDepartmentFacultyId(d) === String(facultyId))

  const selectedFaculty = faculties.find((f) => String(f.id) === String(selectedFacultyId))
  const selectedDepartment = departments.find((d) => String(d.id) === String(selectedDepartmentId))
  const hasSelection = Boolean(selectedFacultyId || selectedDepartmentId)

  const goToStep2 = (facultyId, departmentId = '') => {
    setSelectedFacultyId(String(facultyId || ''))
    setSelectedDepartmentId(String(departmentId || ''))
    setStep(2)
  }

  const nameOf = (item) => item?.name || item?.title || `#${item?.id}`

  // Etape 2 : liste complete des niveaux (tous les BAC visibles, meme si le
  // contexte de filtres courant etait restreint), sinon repli sur `levels`.
  const step2Levels = allLevels.length > 0 ? allLevels : levels

  // Diffuse la classe (faculte puis departement) via des patches successifs —
  // un maillon par patch, la page gere la remise a zero des enfants a chaque
  // changement. Retourne les maillons reels qui ont change.
  const applyClass = () => {
    const facultyId = selectedFacultyId || ''
    const departmentId = selectedFacultyId ? selectedDepartmentId : ''
    // La selection locale est autoritaire (pre-remplie depuis les filtres a
    // l'ouverture) : toute difference — y compris « Toute la faculte » ('') —
    // est un choix explicite a diffuser.
    const facultyChanged = facultyId !== String(filters?.facultyId || '')
    const departmentChanged = departmentId !== String(filters?.departmentId || '')
    if (facultyChanged) {
      onChange({ facultyId })
    }
    if (departmentChanged) {
      onChange({ departmentId })
    }
    return { facultyChanged, departmentChanged }
  }

  // Bouton « Voir mes cours » : applique la classe. Le niveau actif est laisse
  // a la charge de la cascade : conserve si la classe n'a pas change, purge
  // sinon (il n'existerait plus dans la nouvelle classe).
  const apply = () => {
    if (!hasSelection) return
    applyClass()
    onClose()
  }

  // Tap sur un niveau (etape 2) : applique la classe ET le niveau tape.
  // Le niveau tape est explicite : il est retabli apres la cascade si la
  // classe vient de changer. (Corrige le bug ou valider en tapant le BAC
  // perdait la classe choisie a l'etape 1.)
  const commitWithLevel = (levelId) => {
    const target = String(levelId || '')
    const current = String(filters?.levelId || '')
    const { facultyChanged, departmentChanged } = applyClass()
    const lostByCascade = facultyChanged || departmentChanged
    if (target) {
      if (target !== current || lostByCascade) {
        onChange({ levelId: target })
      }
    } else if (!lostByCascade && current) {
      // « Tous les niveaux » : purge explicite, sauf si la cascade l'a deja fait.
      onChange({ levelId: '' })
    }
    onClose()
  }

  const clearSelection = () => {
    onChange({ reset: true })
    setSelectedFacultyId('')
    setSelectedDepartmentId('')
    setExpandedFacultyId('')
    setStep(1)
    onClose()
  }

  // « Tous les niveaux » est gere par commitWithLevel('') : la classe choisie
  // a l'etape 1 est appliquee, le niveau actif est purge.

  return createPortal(
    <div className="ax-sheet-overlay" role="presentation" onClick={onClose}>
      <section
        className="ax-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Choisir ma classe"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ax-sheet__header">
          <span className="ax-sheet__grab" aria-hidden="true" />
          <h2 className="ax-sheet__title">{step === 1 ? 'Mon Departement' : 'Mon Niveau'}</h2>
          <button type="button" className="ax-icon-btn ax-icon-btn--sm" onClick={onClose} aria-label="Fermer">✕</button>
        </header>
        {step === 1 ? (
          <div className="ax-sheet__body">
            <p className="ax-sheet__hint">Etape 1 sur 2 — Choisis ta faculte puis ton departement.</p>
            <ul className="ax-sheet__list">
              {faculties.map((faculty) => {
                const fid = String(faculty.id)
                const isExpanded = expandedFacultyId === fid
                const deps = departmentsOf(fid)
                return (
                  <li key={fid} className={`ax-sheet__group${isExpanded ? ' ax-sheet__group--open' : ''}`}>
                    <button
                      type="button"
                      className="ax-sheet__row"
                      onClick={() => setExpandedFacultyId(isExpanded ? '' : fid)}
                      aria-expanded={isExpanded}
                    >
                      <span aria-hidden="true" className="ax-sheet__row-icon">🏫</span>
                      <span className="ax-sheet__row-label">{nameOf(faculty)}</span>
                      <span className="ax-sheet__row-count">{deps.length} dept.</span>
                      <span className={`ax-sheet__chevron${isExpanded ? ' ax-sheet__chevron--open' : ''}`} aria-hidden="true">›</span>
                    </button>
                    {isExpanded && (
                      <ul className="ax-sheet__sublist">
                        <li>
                          <button type="button" className="ax-sheet__row ax-sheet__row--sub" onClick={() => goToStep2(fid)}>
                            <span aria-hidden="true" className="ax-sheet__row-icon">🌐</span>
                            <span className="ax-sheet__row-label">Toute la faculte</span>
                          </button>
                        </li>
                        {deps.map((dep) => (
                          <li key={String(dep.id)}>
                            <button type="button" className="ax-sheet__row ax-sheet__row--sub" onClick={() => goToStep2(fid, dep.id)}>
                              <span aria-hidden="true" className="ax-sheet__row-icon">🏛️</span>
                              <span className="ax-sheet__row-label">{nameOf(dep)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
              {faculties.length === 0 && (
                <li className="ax-sheet__empty">Aucune faculte disponible pour le moment.</li>
              )}
            </ul>
          </div>
        ) : (
          <div className="ax-sheet__body">
            <p className="ax-sheet__hint">
              Etape 2 sur 2 — Choisis ton niveau{selectedDepartment ? ` (${nameOf(selectedDepartment)})` : ''}.
            </p>
            <button type="button" className="ax-sheet__back" onClick={() => setStep(1)}>
              ← Changer de departement
            </button>
            <ul className="ax-sheet__list">
              <li>
                <button type="button" className="ax-sheet__row" onClick={() => commitWithLevel('')}>
                  <span aria-hidden="true" className="ax-sheet__row-icon">📘</span>
                  <span className="ax-sheet__row-label">Tous les niveaux</span>
                  <span className="ax-sheet__chevron" aria-hidden="true">›</span>
                </button>
              </li>
              {step2Levels.map((level) => (
                <li key={String(level.id)}>
                  <button
                    type="button"
                    className="ax-sheet__row"
                    onClick={() => commitWithLevel(level.id)}
                  >
                    <span aria-hidden="true" className="ax-sheet__row-icon">🎓</span>
                    <span className="ax-sheet__row-label">{nameOf(level)}{level.code ? ` (${level.code})` : ''}</span>
                    <span className="ax-sheet__chevron" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
              {step2Levels.length === 0 && (
                <li className="ax-sheet__empty">Aucun niveau disponible pour le moment.</li>
              )}
            </ul>
          </div>
        )}

        <footer className="ax-sheet__footer">
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--md" onClick={clearSelection}>
            Effacer
          </button>
          <button
            type="button"
            className="ax-btn ax-btn--primary ax-btn--md"
            onClick={apply}
            disabled={!hasSelection}
          >
            Voir mes cours{selectedFaculty ? ` — ${nameOf(selectedFaculty)}${selectedDepartment ? ` / ${nameOf(selectedDepartment)}` : ''}` : ''}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
