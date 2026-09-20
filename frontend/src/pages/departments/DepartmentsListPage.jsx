/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Departments List Page
 * ---------------------------------------------------------------------------
 * CRUD complet : liste, recherche textuelle, pagination, suppression.
 * La colonne Faculte est resolue par une jointure client reelle avec
 * `FacultyApi.list()` (relation Department -> Faculty), sans jamais fabriquer
 * de donnee : toute valeur absente est rendue proprement par un tiret.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DepartmentApi } from '../../api/DepartmentApi'
import { FacultyApi } from '../../api/FacultyApi'
import { useNotification } from '../../hooks/useNotification'
import { useAuth } from '../../hooks/useAuth'
import { hasAdminAccess } from '../../utils/admin'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge, LoadingSpinner } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import {
  normalizeApiList,
  normalizeApiPagination,
  relationName,
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
 * Page de liste des departements.
 * @returns {import('react').JSX.Element}
 */
export default function DepartmentsListPage() {
  const notify = useNotification()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Creation / modification / suppression reservees aux administrateurs.
  const isAdmin = hasAdminAccess(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const facultyIdParam = searchParams.get('facultyId') || ''

  const [departments, setDepartments] = useState([])
  const [faculties, setFaculties] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDepartments = useCallback(async () => {
    setError(null)
    try {
      const response = await DepartmentApi.list()
      setDepartments(normalizeApiList(response))
      setPagination(normalizeApiPagination(response))
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement des departements.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = await DepartmentApi.list()
        if (cancelled) return
        setDepartments(normalizeApiList(response))
        setPagination(normalizeApiPagination(response))
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement des departements.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Jointure reelle : map faculty_id -> faculte (FacultyApi.list()).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = await FacultyApi.list()
        if (cancelled) return
        const map = {}
        for (const faculty of normalizeApiList(response)) {
          if (faculty?.id != null) map[faculty.id] = faculty
        }
        setFaculties(map)
      } catch {
        // La liste des facultes n'est pas bloquante pour la liste des departements.
        if (!cancelled) setFaculties({})
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  /** Nom de la faculte liee (relation imbriquee ou jointure client reelle). */
  const facultyNameOf = (department) =>
    relationName(department, 'faculty') || faculties[department.faculty_id]?.name || ''

  const facultyFilterName = useMemo(() => {
    if (!facultyIdParam) return ''
    return faculties[Number(facultyIdParam)]?.name || faculties[facultyIdParam]?.name || ''
  }, [facultyIdParam, faculties])

  const filteredDepartments = departments.filter((department) => {
    if (facultyIdParam && String(department.faculty_id) !== String(facultyIdParam)) {
      // fallback relation imbriquee
      const relId = String(department?.faculty?.id ?? '')
      if (relId !== String(facultyIdParam)) return false
    }
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const faculty = facultyNameOf(department).toLowerCase()
    return (
      (department.name && department.name.toLowerCase().includes(q)) ||
      (department.code && department.code.toLowerCase().includes(q)) ||
      (department.description && department.description.toLowerCase().includes(q)) ||
      faculty.includes(q)
    )
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await DepartmentApi.delete(deleteTarget.id)
      notify.success(`Departement "${deleteTarget.name}" supprime.`)
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      notify.error(err?.message || 'Erreur lors de la suppression.')
    } finally {
      setIsDeleting(false)
    }
  }

  const clearFacultyFilter = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('facultyId')
    setSearchParams(next)
  }

  return (
    <Container>
      <PageHeader
        title={facultyIdParam ? `Departements${facultyFilterName ? ` — ${facultyFilterName}` : ''}` : 'Departements'}
        subtitle={
          facultyIdParam
            ? `${filteredDepartments.length} departement${filteredDepartments.length !== 1 ? 's' : ''} pour cette faculte`
            : `${departments.length} departement${departments.length !== 1 ? 's' : ''}`
        }
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {facultyIdParam && (
              <Button variant="ghost" size="md" onClick={clearFacultyFilter}>
                &larr; Toutes les facultes
              </Button>
            )}
            {isAdmin && (
              <Link to={`${ROUTE_PATHS.DEPARTMENTS}/create${facultyIdParam ? `?facultyId=${facultyIdParam}` : ''}`}>
                <Button variant="primary" size="md">
                  <PlusIcon /> Nouveau departement
                </Button>
              </Link>
            )}
          </div>
        }
      />
      {facultyIdParam && (
        <div className="ax-alert" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Filtre actif : faculte #{facultyIdParam}{facultyFilterName ? ` — ${facultyFilterName}` : ''}</span>
          <Button variant="ghost" size="sm" onClick={clearFacultyFilter}>Effacer le filtre</Button>
        </div>
      )}
{/* Recherche */}
      <div className="ax-search-bar">
        <span className="ax-search-bar__icon"><SearchIcon /></span>
        <input
          className="ax-search-bar__input"
          type="text"
          placeholder="Rechercher un departement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un departement"
        />
      </div>

      {/* Chargement */}
      {isLoading && (
        <div style={{ padding: 'var(--ax-space-12) 0' }}>
          <LoadingSpinner label="Chargement des departements..." />
        </div>
      )}

      {/* Erreur */}
      {error && !isLoading && (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDepartments}>
            Reessayer
          </Button>
        </div>
      )}

      {/* Etat vide */}
      {!isLoading && !error && filteredDepartments.length === 0 && (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun departement trouve</p>
          <p className="ax-empty-state__desc">
            {search
              ? "Aucun resultat pour votre recherche. Essayez avec d'autres termes."
              : 'Commencez par creer votre premier departement.'}
          </p>
          {!search && isAdmin && (
            <Link to={`${ROUTE_PATHS.DEPARTMENTS}/create`}>
              <Button variant="primary" size="md">
                <PlusIcon /> Creer un departement
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && filteredDepartments.length > 0 && (
        <>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Faculte</th>
                  <th>Description</th>
                  <th>Statut</th>
                  {isAdmin && <th className="ax-table__actions-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((department) => {
                  const faculty = facultyNameOf(department)
                  const active = isActiveStatus(department.status)
                  return (
                    <tr
                      key={department.id}
                      onClick={() => navigate(`${ROUTE_PATHS.COURSES}?departmentId=${department.id}`)}
                      style={{ cursor: 'pointer' }}
                      title={`Voir les cours de ${department.name}`}
                    >
                      <td className="ax-table__cell--strong">
                        <Link
                          to={`${ROUTE_PATHS.COURSES}?departmentId=${department.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                        >
                          {department.name}
                        </Link>
                      </td>
                      <td>
                        {department.code ? (
                          <Badge variant="primary" size="sm">{department.code}</Badge>
                        ) : (
                          <span className="ax-text-tertiary">-</span>
                        )}
                      </td>
                      <td className="ax-table__cell--secondary">
                        {faculty || <span className="ax-text-tertiary">-</span>}
                      </td>
                      <td className="ax-table__cell--secondary">
                        {department.description || <span className="ax-text-tertiary">-</span>}
                      </td>
                      <td>
                        <Badge variant={active ? 'primary' : 'default'} size="sm">
                          {statusLabel(department.status)}
                        </Badge>
                      </td>
                      <td className="ax-table__cell--actions">
                        <Link
                          to={`${ROUTE_PATHS.COURSES}?departmentId=${department.id}`}
                          className="ax-icon-btn ax-icon-btn--sm"
                          aria-label={`Voir les cours de ${department.name}`}
                          title="Voir les cours"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* book icon */}
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4z"/><path d="M4 4a2 2 0 0 1 2-2h8"/><path d="M7 8h6M7 12h6"/></svg>
                        </Link>
                        <Link
                          to={ROUTE_PATHS.LEVELS}
                          className="ax-icon-btn ax-icon-btn--sm"
                          aria-label={`Voir les niveaux`}
                          title="Voir les niveaux"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 14l7-7 7 7"/><path d="M5 12l5-5 5 5"/></svg>
                        </Link>
                        {isAdmin && (
                          <>
                            <Link
                              to={`${ROUTE_PATHS.DEPARTMENTS}/${department.id}/edit`}
                              className="ax-icon-btn ax-icon-btn--sm"
                              aria-label={`Modifier ${department.name}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EditIcon />
                            </Link>
                            <button
                              className="ax-icon-btn ax-icon-btn--sm"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(department) }}
                              aria-label={`Supprimer ${department.name}`}
                              style={{ color: 'var(--ax-danger)' }}
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
        title="Supprimer le departement"
        message={`Voulez-vous vraiment supprimer le departement "${deleteTarget?.name}" ? Cette action est irreversible.`}
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