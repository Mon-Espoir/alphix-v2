/**
 * ALPHIX V2 — DocumentFilters
 * Filtres multi-facettes : hierarchie academique + type + dates + compteurs.
 * Sur mobile (< 640px) : mode compact avec puces doc_type + accordéon pour le reste.
 */

import { memo, useCallback, useMemo, useState, useEffect } from 'react'
import Button from '../ui/Button'
import ClassPickerSheet from './ClassPickerSheet'
import { DOC_TYPES, DOC_VISIBILITIES, DOC_TYPE_GROUPS } from '../../utils/document'
import { toSelectOptions, semesterOptionsForLevel } from '../../utils/academic'

/**
 * Groupes mobile-first (1 tap = catégorie parlante) — correspond au backend doc_type.
 * `key` est la clé technique stockée dans `filters.docType` : les groupes de
 * plusieurs types sont filtres CÔTE SERVEUR via `doc_types[]`.
 */
const MOBILE_CHIP_GROUPS = [
  { key: 'syllabus_course', label: 'Syllabus / Cours', values: DOC_TYPE_GROUPS.syllabus_course, icon: '📚' },
  { key: 'exam_correction', label: 'Examens', values: DOC_TYPE_GROUPS.exam_correction, icon: '📄' },
  { key: 'tp_td', label: 'TP / TD', values: DOC_TYPE_GROUPS.tp_td, icon: '📝' },
  { key: 'presentation', label: 'Exposés', values: ['presentation'], icon: '🎤' },
  { key: 'report', label: 'Rapports', values: ['report'], icon: '📋' },
]

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
 * @param {boolean} [props.isLoading] - Référentiels en cours de chargement
 *   (réseau lent) : le bouton de classe est désactivé et le tiroir affiche
 *   un squelette au lieu de listes vides.
 * @returns {import('react').JSX.Element}
 */
function DocumentFilters({
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
  isLoading = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const toggleGroup = useCallback((key, values) => {
    // Groupe actif -> deselection, sinon selection du groupe (serveur filtre
    // via `doc_types[]`). Plus d'heuristique sur la taille du tableau :
    // "Examens" ne tombait plus dans "TP/TD".
    const active = values.includes(filters.docType) || filters.docType === key
    onChange({ docType: active ? '' : key })
  }, [filters.docType, onChange])

  // Sur desktop (>= 640px) : toujours étendu.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    const handler = (e) => setIsExpanded(e.matches)
    handler(mql)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const set = useCallback((key) => (event) => onChange({ [key]: event.target.value }), [onChange])
  const handleReset = useCallback(() => onChange({ reset: true }), [onChange])

  const selectedLevelCode = levels.find((l) => String(l.id) === String(filters.levelId))?.code || ''
  const effectiveLevelCode = selectedLevelCode

  // Options memoïsées pour éviter de reconstruire ~867 objets <option> à chaque frappe
  const facultyOptions = useMemo(() => toSelectOptions(faculties), [faculties])
  const departmentOptions = useMemo(() => toSelectOptions(departments), [departments])
  const levelOptions = useMemo(() => toSelectOptions(levels), [levels])
  const courseOptions = useMemo(() => toSelectOptions(courses), [courses])
  const tagOptions = useMemo(() => toSelectOptions(tags), [tags])
  const semOpts = useMemo(
    () => semesterOptionsForLevel(semesters, effectiveLevelCode),
    [semesters, effectiveLevelCode],
  )

  // Nombre de filtres actifs (pour le badge).
  const activeCount = useMemo(() => [
    filters.facultyId, filters.departmentId, filters.levelId,
    filters.semesterId, filters.courseId, filters.docType,
    filters.visibility, filters.tagId, filters.fromDate,
    filters.toDate, filters.minDownloads, filters.minViews,
  ].filter(Boolean).length, [filters])

  return (
    <div className="ax-card ax-card--padded ax-filters-wrapper">
      {/* --- Mobile : selection directe de classe + puces doc_type --- */}
      <div className="ax-filters-mobile-header">
        <button
          type="button"
          className="ax-btn ax-btn--primary ax-btn--sm ax-filters-class-btn"
          onClick={() => setIsPickerOpen(true)}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? '⏳ Chargement…' : '🎓 Choisir ma classe'}
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
          isLoading={isLoading}
        />
        {!isExpanded && (
          <div className="ax-filters-chips" role="group" aria-label="Catégorie de document — 1 tap">
            {MOBILE_CHIP_GROUPS.map((g) => {
              const active = g.values.includes(filters.docType) || filters.docType === g.key
              return (
                <button
                  key={g.key}
                  type="button"
                  className={`ax-filter-chip ax-filter-chip--mobile${active ? ' ax-filter-chip--active' : ''}`}
                  onClick={() => toggleGroup(g.key, g.values)}
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
              {facultyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-department">Departement</label>
            <select id="doc-f-department" className="ax-form-group__input" value={filters.departmentId || ''} onChange={set('departmentId')}>
              <option value="">Tous les departements</option>
              {departmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="doc-f-level">Niveau</label>
            <select id="doc-f-level" className="ax-form-group__input" value={filters.levelId || ''} onChange={set('levelId')}>
              <option value="">Tous les niveaux</option>
              {levelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
              {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
              {tagOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
          <Button type="button" variant="ghost" size="md" onClick={handleReset}>
            Reinitialiser
          </Button>
        </div>
      </form>
    </div>
  )
}

export default memo(DocumentFilters)