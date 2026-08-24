/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Courses List Page
 * ---------------------------------------------------------------------------
 * Recherche multicritere : filtrage combine par departement, niveau et
 * semestre, reposee sur les seuls endpoints reels exposes par `CourseApi`
 * (`getByDepartment` / `getByLevel` / `getBySemester` — l'API Laravel n'expose
 * pas d'index courses). Aucune donnee n'est fabriquee : liste, recherche
 * textuelle, pagination et suppression.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CourseApi } from '../../api/CourseApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { SemesterApi } from '../../api/SemesterApi'
import { useNotification } from '../../hooks/useNotification'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge, LoadingSpinner } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import {
  normalizeApiList,
  normalizeApiPagination,
  toSelectOptions,
  isActiveStatus,
  statusLabel,
} from '../../utils/academic'

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" />
  </svg>
)

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h14M7 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M8 9v6M12 9v6" />
    <path d="M5 5l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
  </svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="9" cy="9" r="6" />
    <line x1="13.5" y1="13.5" x2="17" y2="17" />
  </svg>
)

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="10" y1="4" x2="10" y2="16" />
    <line x1="4" y1="10" x2="16" y2="10" />
  </svg>
)

/**
 * Page de liste des cours (recherche multicritere).
 * @returns {import('react').JSX.Element}
 */
export default function CoursesListPage() {
  const notify = useNotification()

  const [departments, setDepartments] = useState([])
  const [levels, setLevels] = useState([])
  const [semesters, setSemesters] = useState([])

  const [departmentId, setDepartmentId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [semesterId, setSemesterId] = useState('')

  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // References de filtrage (departements, niveaux, semestres).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (cancelled) return
        const deptRes = await DepartmentApi.list()
        const levelRes = await LevelApi.list()
        const semRes = await SemesterApi.list()
        if (cancelled) return
        setDepartments(normalizeApiList(deptRes))
        setLevels(normalizeApiList(levelRes))
        setSemesters(normalizeApiList(semRes))
      } catch {
        if (!cancelled) {
          setDepartments([])
          setLevels([])
          setSemesters([])
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = departmentId
          ? await CourseApi.getByDepartment(departmentId)
          : levelId
            ? await CourseApi.getByLevel(levelId)
            : semesterId
              ? await CourseApi.getBySemester(semesterId)
              : null
        if (!response || cancelled) return
        setCourses(normalizeApiList(response))
        setPagination(normalizeApiPagination(response))
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setCourses([])
          setError(err?.message || 'Erreur lors du chargement des cours.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [departmentId, levelId, semesterId])

  /** Rechargement manuel (bouton Reessayer) — jamais appele depuis un effet. */
  const fetchCourses = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const response = departmentId
        ? await CourseApi.getByDepartment(departmentId)
        : levelId
          ? await CourseApi.getByLevel(levelId)
          : semesterId
            ? await CourseApi.getBySemester(semesterId)
            : null
      if (!response) return
      setCourses(normalizeApiList(response))
      setPagination(normalizeApiPagination(response))
    } catch (err) {
      setCourses([])
      setError(err?.message || 'Erreur lors du chargement des cours.')
    } finally {
      setIsLoading(false)
    }
  }, [departmentId, levelId, semesterId])

  const departmentOptions = toSelectOptions(departments)
  const levelOptions = toSelectOptions(levels)
  const semesterOptions = toSelectOptions(semesters)

  const hasPrimaryFilter = Boolean(departmentId || levelId || semesterId)

  // Ajuste les filtres niveau / semestre sur des identifiants numeriques.
  const filteredCourses = courses.filter((course) => {
    if (levelId && course.level_id != null && course.level_id !== Number(levelId)) return false
    if (semesterId && course.semester_id != null && course.semester_id !== Number(semesterId)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const title = (course.title || course.name || '').toLowerCase()
    return (
      (course.code && course.code.toLowerCase().includes(q)) ||
      title.includes(q)
    )
  })

  const setFilterDepartement = (value) => {
    setDepartmentId(value)
    setIsLoading(true)
    setError(null)
  }

  const setFilterNiveau = (value) => {
    setLevelId(value)
    setIsLoading(true)
    setError(null)
  }

  const setFilterSemestre = (value) => {
    setSemesterId(value)
    setIsLoading(true)
    setError(null)
  }

  const resetFilters = () => {
    setDepartmentId('')
    setLevelId('')
    setSemesterId('')
    setSearch('')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await CourseApi.delete(deleteTarget.id)
      notify.success(`Cours "${deleteTarget.title || deleteTarget.name}" supprime.`)
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      notify.error(err?.message || 'Erreur lors de la suppression.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Container>
      <PageHeader
        title="Cours"
        subtitle={`${courses.length} cours charge${courses.length !== 1 ? 's' : ''}`}
        actions={
          <Link to={`${ROUTE_PATHS.COURSES}/create`}>
            <Button variant="primary" size="md">
              <PlusIcon /> Nouveau cours
            </Button>
          </Link>
        }
      />

      {/* Recherche multicritere : filtres combines departement / niveau / semestre */}
      <form className="ax-card ax-card--padded" onSubmit={(e) => e.preventDefault()}>
        <div className="ax-form-stack">
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-filter-department">Departement</label>
            <select
              id="course-filter-department"
              className="ax-form-group__input"
              value={departmentId}
              onChange={(e) => setFilterDepartement(e.target.value)}
            >
              <option value="">Tous les departements</option>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-filter-level">Niveau</label>
            <select
              id="course-filter-level"
              className="ax-form-group__input"
              value={levelId}
              onChange={(e) => setFilterNiveau(e.target.value)}
            >
              <option value="">Tous les niveaux</option>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="course-filter-semester">Semestre</label>
            <select
              id="course-filter-semester"
              className="ax-form-group__input"
              value={semesterId}
              onChange={(e) => setFilterSemestre(e.target.value)}
            >
              <option value="">Tous les semestres</option>
              {semesterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="ax-form-actions">
          <Button type="button" variant="ghost" size="md" onClick={resetFilters}>
            Reinitialiser
          </Button>
        </div>
      </form>

      {/* Recherche textuelle */}
      <div className="ax-search-bar">
        <span className="ax-search-bar__icon"><SearchIcon /></span>
        <input
          className="ax-search-bar__input"
          type="text"
          placeholder="Rechercher un cours par code ou nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un cours"
        />
      </div>

      {/* Etats : critere manquant / chargement / erreur / vide / table */}
      {!hasPrimaryFilter ? (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Selectionnez un critere</p>
          <p className="ax-empty-state__desc">
            Choisissez un departement, un niveau ou un semestre pour lister les cours reels.
          </p>
        </div>
      ) : isLoading ? (
        <div style={{ padding: 'var(--ax-space-12) 0' }}>
          <LoadingSpinner label="Chargement des cours..." />
        </div>
      ) : error ? (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchCourses}>
            Reessayer
          </Button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun cours trouve</p>
          <p className="ax-empty-state__desc">
            {search
              ? 'Aucun cours ne correspond a vos criteres. Ajustez les filtres ou la recherche.'
              : 'Aucun cours pour cette combinaison de filtres.'}
          </p>
        </div>
      ) : (
        <>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Nom</th>
                  <th>Credits ECTS</th>
                  <th>Statut</th>
                  <th>Documents</th>
                  <th className="ax-table__actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      {course.code ? (
                        <Badge variant="primary" size="sm">{course.code}</Badge>
                      ) : (
                        <span className="ax-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="ax-table__cell--strong">{course.title || course.name || '-'}</td>
                    <td>{course.credits != null ? course.credits : '-'}</td>
                    <td>
                      <Badge variant={isActiveStatus(course.status) ? 'primary' : 'default'} size="sm">
                        {statusLabel(course.status)}
                      </Badge>
                    </td>
                    <td>
                      {course.total_documents != null ? (
                        <Badge variant="default" size="sm">{course.total_documents}</Badge>
                      ) : (
                        <span className="ax-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="ax-table__cell--actions">
                      <Link
                        to={`${ROUTE_PATHS.COURSES}/${course.id}/edit`}
                        state={{ course }}
                        className="ax-icon-btn ax-icon-btn--sm"
                        aria-label={`Modifier ${course.title || course.name}`}
                      >
                        <EditIcon />
                      </Link>
                      <button
                        className="ax-icon-btn ax-icon-btn--sm"
                        onClick={() => setDeleteTarget(course)}
                        aria-label={`Supprimer ${course.title || course.name}`}
                        style={{ color: 'var(--ax-danger)' }}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.lastPage > 1 && (
            <div className="ax-pagination">
              <span className="ax-pagination__info">
                Page {pagination.currentPage} sur {pagination.lastPage} ({pagination.total} resultats)
              </span>
            </div>
          )}
        </>
      )}

      {/* Confirmation de suppression */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer le cours"
        message={`Voulez-vous vraiment supprimer le cours "${deleteTarget?.title || deleteTarget?.name}" ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Container>
  )
}