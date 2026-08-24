/**
 * ALPHIX V2 — DocumentFilters
 * Filtres multi-facettes : hierarchie academique + type + dates + compteurs.
 */

import Button from '../ui/Button'
import { DOC_TYPES, DOC_VISIBILITIES } from '../../utils/document'
import { toSelectOptions } from '../../utils/academic'

/**
 * @param {object} props
 * @param {Array<object>} [props.faculties] - Facultes (API).
 * @param {Array<object>} [props.departments] - Departements (API).
 * @param {Array<object>} [props.levels] - Niveaux (API).
 * @param {Array<object>} [props.semesters] - Semestres (API).
 * @param {Array<object>} [props.courses] - Cours (API).
 * @param {Array<object>} [props.tags] - Tags (API).
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
  filters,
  onChange,
}) {
  const set = (key) => (event) => onChange({ [key]: event.target.value })
  const optionList = toSelectOptions

  return (
    <form className="ax-card ax-card--padded" onSubmit={(event) => event.preventDefault()} aria-label="Filtres de documents">
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
          <label className="ax-form-group__label" htmlFor="doc-f-semester">Semestre</label>
          <select id="doc-f-semester" className="ax-form-group__input" value={filters.semesterId || ''} onChange={set('semesterId')}>
            <option value="">Tous les semestres</option>
            {optionList(semesters).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
  )
}