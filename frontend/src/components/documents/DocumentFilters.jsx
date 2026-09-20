/**
 * ALPHIX V2 — DocumentFilters
 * Filtres multi-facettes : hierarchie academique + type + dates + compteurs.
 * Sur mobile (< 640px) : mode compact avec puces doc_type + accordéon pour le reste.
 */

import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import ClassPickerSheet from './ClassPickerSheet'
import { DOC_TYPES, DOC_VISIBILITIES } from '../../utils/document'
import { toSelectOptions, semesterOptionsForLevel } from '../../utils/academic'

/**
 * @param {object} props
 * @param {Array<object>} [props.faculties] - Facultes (API).
 * @param {Array<object>} [props.departments] - Departements (API).
 * @param {Array<object>} [props.levels] - Niveaux (API).
 * @param {Array<object>} [props.semesters] - Semestres (API).
 * @param {Array<object>} [props.courses] - Cours (API).
 * @param {Array<object>} [props.tags] - Tags (API).
 * @param {Array<object>} [props.allDepartments] - Departements complets (API, pour le tiroir de classe).
 * @param {Array<object>} [props.allLevels] - Niveaux complets (API, pour le tiroir de classe).
 * @param {object} props.filters - Valeurs actives.
 * @param {(patch: object) => void} props.onChange - Patch de filtres.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentFilters({
  faculties = [],
  departments = [],
  levels = [],
  semesters = [],
  courses = [],
  tags = [],
  allDepartments = [],
  allLevels = [],
  filters,
  onChange,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Groupes mobile-first (1 tap = catégorie parlante) — correspond au backend doc_type
  const MOBILE_CHIP_GROUPS = [
    { label: 'Syllabus / Cours', values: ['syllabus', 'course'], icon: '📚' },
    { label: 'Examens', values: ['exam', 'correction'], icon: '📄' },
    { label: 'TP / TD', values: ['tp', 'td'], icon: '📝' },
    { label: 'Exposés', values: ['presentation'], icon: '🎤' },
    { label: 'Rapports', values: ['report'], icon: '📋' },
  ]
  const isGroupActive = (values) => values.includes(filters.docType)
  const toggleGroup = (values) => {
    // Groupe actif -> désélection, sinon sélection du premier type du groupe
    // Pour TP/TD et Syllabus/Cours, on stocke une clé groupe pour le filtrage client
    const groupKey = values.length > 1 ? (values.includes('syllabus') ? 'syllabus_course' : 'tp_td') : values[0]
    const active = isGroupActive(values) || filters.docType === groupKey
    onChange({ docType: active ? '' : (values.length > 1 ? groupKey : values[0]) })
  }

  // Sur desktop (>= 640px) : toujours étendu.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    const handler = (e) => setIsExpanded(e.matches)
    handler(mql)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const set = (key) => (event) => onChange({ [key]: event.target.value })
  const optionList = toSelectOptions
  const selectedLevelCode = levels.find((l) => String(l.id) === String(filters.levelId))?.code ||
    // fallback: si levels filtrés (availableLevels) ne contient pas le filtre actuel, on garde le label brut
    ''
  // Si le niveau sélectionné n'est pas dans les levels disponibles (filtrage fdCourses), on cherche globalement
  const effectiveLevelCode = selectedLevelCode
  const semOpts = semesterOptionsForLevel(semesters, effectiveLevelCode)

  // Nombre de filtres actifs (pour le badge).
  const activeCount = [
    filters.facultyId, filters.departmentId, filters.levelId,
    filters.semesterId, filters.courseId, filters.docType,
    filters.visibility, filters.tagId, filters.fromDate,
    filters.toDate, filters.minDownloads, filters.minViews,
  ].filter(Boolean).length

  return (
    <div className="ax-card ax-card--padded ax-filters-wrapper">
      {/* --- Mobile : selection directe de classe + puces doc_type --- */}
      <div className="ax-filters-mobile-header">
        <button
          type="button"
          className="ax-btn ax-btn--primary ax-btn--sm ax-filters-class-btn"
          onClick={() => setIsPickerOpen(true)}
        >
          🎓 Choisir ma classe
        </button>
        <button
          type="button"
          className="ax-btn ax-btn--ghost ax-btn--sm ax-filters-toggle"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="ax-filters-body"
        >
          Plus de filtres{activeCount > 0 ? ` (${activeCount})` : ''}
          <span className={`ax-filters-toggle__arrow${isExpanded ? ' ax-filters-toggle__arrow--open' : ''}`} aria-hidden="true">&#9662;</span>
        </button>
        <ClassPickerSheet
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          faculties={faculties}
          departments={allDepartments}
          levels={levels}
          allLevels={allLevels}
          filters={filters}
          onChange={onChange}
        />
        {!isExpanded && (
          <div className="ax-filters-chips" role="group" aria-label="Catégorie de document — 1 tap">
            {MOBILE_CHIP_GROUPS.map((g) => {
              const active = g.values.includes(filters.docType) || filters.docType === (g.values.includes('syllabus') ? 'syllabus_course' : g.values.length > 1 ? 'tp_td' : '')
              return (
                <button
                  key={g.label}
                  type="button"
                  className={`ax-filter-chip ax-filter-chip--mobile${active ? ' ax-filter-chip--active' : ''}`}
                  onClick={() => toggleGroup(g.values)}
                  aria-pressed={active}
                >
                  <span aria-hidden="true">{g.icon}</span> {g.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* --- Corps des filtres (accordéon sur mobile, toujours visible sur desktop) --- */}
      <form
        id="ax-filters-body"
        className={`ax-filters-body${isExpanded ? ' ax-filters-body--open' : ''}`}
        onSubmit={(event) => event.preventDefault()}
        aria-label="Filtres de documents"
      >
        <div className="ax-form-stack">
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-faculty">Faculte</label>
            <select id="doc-f-faculty" className="ax-form-group__input" value={filters.facultyId || ''} onChange={set('facultyId')}>
              <option value="">Toutes les facultes</option>
              {optionList(faculties).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-department">Departement</label>
            <select id="doc-f-department" className="ax-form-group__input" value={filters.departmentId || ''} onChange={set('departmentId')}>
              <option value="">Tous les departements</option>
              {optionList(departments).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-level">Niveau</label>
            <select id="doc-f-level" className="ax-form-group__input" value={filters.levelId || ''} onChange={set('levelId')}>
              <option value="">Tous les niveaux</option>
              {optionList(levels).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-semester">Semestre{effectiveLevelCode && /^BAC(\d+)$/.test(effectiveLevelCode) ? ` — ${effectiveLevelCode} → ${Number(effectiveLevelCode.replace('BAC',''))*2-1}/${Number(effectiveLevelCode.replace('BAC',''))*2}` : ''}</label>
            <select id="doc-f-semester" className="ax-form-group__input" value={filters.semesterId || ''} onChange={set('semesterId')}>
              <option value="">Tous les semestres</option>
              {semOpts.map((o) => <option key={o.value} value={o.value}>{o.label}{effectiveLevelCode ? ` (${o.raw?.code || ''})` : ''}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-course">Cours</label>
            <select id="doc-f-course" className="ax-form-group__input" value={filters.courseId || ''} onChange={set('courseId')}>
              <option value="">Tous les cours</option>
              {optionList(courses).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-type">Type de document</label>
            <select id="doc-f-type" className="ax-form-group__input" value={filters.docType || ''} onChange={set('docType')}>
              <option value="">Tous les types</option>
              {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-visibility">Visibilite</label>
            <select id="doc-f-visibility" className="ax-form-group__input" value={filters.visibility || ''} onChange={set('visibility')}>
              <option value="">Toutes les visibilites</option>
              {DOC_VISIBILITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-tag">Tag</label>
            <select id="doc-f-tag" className="ax-form-group__input" value={filters.tagId || ''} onChange={set('tagId')}>
              <option value="">Tous les tags</option>
              {optionList(tags).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-from">Du</label>
            <input id="doc-f-from" className="ax-form-group__input" type="date" value={filters.fromDate || ''} onChange={set('fromDate')} />
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-to">Au</label>
            <input id="doc-f-to" className="ax-form-group__input" type="date" value={filters.toDate || ''} onChange={set('toDate')} />
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-downloads">Telechargements min.</label>
            <input id="doc-f-downloads" className="ax-form-group__input" type="number" min="0" value={filters.minDownloads ?? ''} onChange={set('minDownloads')} />
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-views">Vues min.</label>
            <input id="doc-f-views" className="ax-form-group__input" type="number" min="0" value={filters.minViews ?? ''} onChange={set('minViews')} />
          </div>
        </div>
        <div className="ax-form-actions">
          <Button type="button" variant="ghost" size="md" onClick={() => onChange({ reset: true })}>
            Reinitialiser
          </Button>
        </div>
      </form>
    </div>
  )
}