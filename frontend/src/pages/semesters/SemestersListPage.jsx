/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Semesters List Page
 * ---------------------------------------------------------------------------
 * CRUD complet : liste, recherche, pagination, suppression.
 * Colonne compteur de cours rendue defensivement (tiret) quand le backend
 * immutable ne renvoie aucune donnee.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { SemesterApi } from '../../api/SemesterApi'
import { useNotification } from '../../hooks/useNotification'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge, LoadingSpinner } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import {
  normalizeApiList,
  normalizeApiPagination,
  countOf,
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
 * Page de liste des semestres.
 * @returns {import('react').JSX.Element}
 */
export default function SemestersListPage() {
  const notify = useNotification()

  const [semesters, setSemesters] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchSemesters = useCallback(async () => {
    setError(null)
    try {
      const response = await SemesterApi.list()
      setSemesters(normalizeApiList(response))
      setPagination(normalizeApiPagination(response))
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement des semestres.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = await SemesterApi.list()
        if (cancelled) return
        setSemesters(normalizeApiList(response))
        setPagination(normalizeApiPagination(response))
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement des semestres.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const filteredSemesters = semesters.filter((semester) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (semester.name && semester.name.toLowerCase().includes(q)) ||
      (semester.code && semester.code.toLowerCase().includes(q))
    )
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await SemesterApi.delete(deleteTarget.id)
      notify.success(`Semestre "${deleteTarget.name}" supprime.`)
      setSemesters((prev) => prev.filter((s) => s.id !== deleteTarget.id))
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
        title="Semestres"
        subtitle={`${semesters.length} semestre${semesters.length !== 1 ? 's' : ''}`}
        actions={
          <Link to={`${ROUTE_PATHS.SEMESTERS}/create`}>
            <Button variant="primary" size="md">
              <PlusIcon /> Nouveau semestre
            </Button>
          </Link>
        }
      />

      {/* Recherche */}
      <div className="ax-search-bar">
        <span className="ax-search-bar__icon"><SearchIcon /></span>
        <input
          className="ax-search-bar__input"
          type="text"
          placeholder="Rechercher un semestre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un semestre"
        />
      </div>

      {/* Chargement */}
      {isLoading && (
        <div style={{ padding: 'var(--ax-space-12) 0' }}>
          <LoadingSpinner label="Chargement des semestres..." />
        </div>
      )}

      {/* Erreur */}
      {error && !isLoading && (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSemesters}>
            Reessayer
          </Button>
        </div>
      )}

      {/* Etat vide */}
      {!isLoading && !error && filteredSemesters.length === 0 && (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun semestre trouve</p>
          <p className="ax-empty-state__desc">
            {search
              ? "Aucun resultat pour votre recherche. Essayez avec d'autres termes."
              : 'Commencez par creer votre premier semestre.'}
          </p>
          {!search && (
            <Link to={`${ROUTE_PATHS.SEMESTERS}/create`}>
              <Button variant="primary" size="md">
                <PlusIcon /> Creer un semestre
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && filteredSemesters.length > 0 && (
        <>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Ordre</th>
                  <th>Statut</th>
                  <th>Cours</th>
                  <th className="ax-table__actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSemesters.map((semester) => {
                  const courses = countOf(semester, { countKey: 'courses_count', arrayKey: 'courses' })
                  return (
                    <tr key={semester.id}>
                      <td className="ax-table__cell--strong">{semester.name}</td>
                      <td>
                        {semester.code ? (
                          <Badge variant="primary" size="sm">{semester.code}</Badge>
                        ) : (
                          <span className="ax-text-tertiary">-</span>
                        )}
                      </td>
                      <td>{semester.position}</td>
                      <td>
                        <Badge variant={isActiveStatus(semester.status) ? 'primary' : 'default'} size="sm">
                          {statusLabel(semester.status)}
                        </Badge>
                      </td>
                      <td>
                        {courses != null ? (
                          <Badge variant="default" size="sm">{courses}</Badge>
                        ) : (
                          <span className="ax-text-tertiary">-</span>
                        )}
                      </td>
                      <td className="ax-table__cell--actions">
                        <Link
                          to={`${ROUTE_PATHS.SEMESTERS}/${semester.id}/edit`}
                          className="ax-icon-btn ax-icon-btn--sm"
                          aria-label={`Modifier ${semester.name}`}
                        >
                          <EditIcon />
                        </Link>
                        <button
                          className="ax-icon-btn ax-icon-btn--sm"
                          onClick={() => setDeleteTarget(semester)}
                          aria-label={`Supprimer ${semester.name}`}
                          style={{ color: 'var(--ax-danger)' }}
                        >
                          <TrashIcon />
                        </button>
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
        title="Supprimer le semestre"
        message={`Voulez-vous vraiment supprimer le semestre "${deleteTarget?.name}" ? Cette action est irreversible.`}
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