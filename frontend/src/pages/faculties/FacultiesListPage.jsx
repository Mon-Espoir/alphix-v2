/**
 * ALPHIX V2 — Faculties List Page
 * CRUD complet : liste, recherche, pagination, actions, suppression.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FacultyApi } from '../../api/FacultyApi'
import { useNotification } from '../../hooks/useNotification'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge, LoadingSpinner } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'

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
 * Normalize API response to always return an array.
 * Handles both array responses and Laravel paginated { data: [...] }.
 */
function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (response && Array.isArray(response.data)) return response.data
  return []
}

/**
 * Normalize pagination info from Laravel response.
 */
function normalizePagination(response) {
  if (response && typeof response === 'object' && !Array.isArray(response) && response.last_page) {
    return {
      currentPage: response.current_page || 1,
      lastPage: response.last_page || 1,
      total: response.total || 0,
      perPage: response.per_page || 15,
    }
  }
  return null
}

/**
 * @returns {import('react').JSX.Element}
 */
export default function FacultiesListPage() {
  const notify = useNotification()

  const [faculties, setFaculties] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchFaculties = useCallback(async () => {
    setError(null)
    try {
      const response = await FacultyApi.list()
      setFaculties(normalizeList(response))
      setPagination(normalizePagination(response))
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement des facultes.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = await FacultyApi.list()
        if (cancelled) return
        setFaculties(normalizeList(response))
        setPagination(normalizePagination(response))
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement des facultes.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const filteredFaculties = faculties.filter((f) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.code && f.code.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q))
    )
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await FacultyApi.delete(deleteTarget.id)
      notify.success(`Faculte "${deleteTarget.name}" supprimee.`)
      setFaculties((prev) => prev.filter((f) => f.id !== deleteTarget.id))
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
        title="Facultes"
        subtitle={`${faculties.length} faculte${faculties.length !== 1 ? 's' : ''} enregistree${faculties.length !== 1 ? 's' : ''}`}
        actions={
          <Link to={`${ROUTE_PATHS.FACULTIES}/create`}>
            <Button variant="primary" size="md">
              <PlusIcon /> Nouvelle faculte
            </Button>
          </Link>
        }
      />

      {/* Search */}
      <div className="ax-search-bar">
        <span className="ax-search-bar__icon"><SearchIcon /></span>
        <input
          className="ax-search-bar__input"
          type="text"
          placeholder="Rechercher une faculte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher une faculte"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: 'var(--ax-space-12) 0' }}>
          <LoadingSpinner label="Chargement des facultes..." />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchFaculties}>
            Reessayer
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && filteredFaculties.length === 0 && (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucune faculte trouvee</p>
          <p className="ax-empty-state__desc">
            {search
              ? 'Aucun resultat pour votre recherche. Essayez avec d\'autres termes.'
              : 'Commencez par creer votre premiere faculte.'}
          </p>
          {!search && (
            <Link to={`${ROUTE_PATHS.FACULTIES}/create`}>
              <Button variant="primary" size="md">
                <PlusIcon /> Creer une faculte
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && filteredFaculties.length > 0 && (
        <>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Departements</th>
                  <th className="ax-table__actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculties.map((faculty) => (
                  <tr key={faculty.id}>
                    <td className="ax-table__cell--strong">{faculty.name}</td>
                    <td>
                      {faculty.code ? (
                        <Badge variant="primary" size="sm">{faculty.code}</Badge>
                      ) : (
                        <span className="ax-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="ax-table__cell--secondary">
                      {faculty.description || <span className="ax-text-tertiary">-</span>}
                    </td>
                    <td>
                      {faculty.departments_count != null ? (
                        <Badge variant="default" size="sm">{faculty.departments_count}</Badge>
                      ) : (
                        <span className="ax-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="ax-table__cell--actions">
                      <Link
                        to={`${ROUTE_PATHS.FACULTIES}/${faculty.id}/edit`}
                        className="ax-icon-btn ax-icon-btn--sm"
                        aria-label={`Modifier ${faculty.name}`}
                      >
                        <EditIcon />
                      </Link>
                      <button
                        className="ax-icon-btn ax-icon-btn--sm"
                        onClick={() => setDeleteTarget(faculty)}
                        aria-label={`Supprimer ${faculty.name}`}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer la faculte"
        message={`Voulez-vous vraiment supprimer la faculte "${deleteTarget?.name}" ? Cette action est irreversible.`}
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
