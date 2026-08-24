/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Levels List Page
 * ---------------------------------------------------------------------------
 * CRUD complet : liste, recherche, pagination, suppression.
 * Affiche les colonnes specifiees ; les champs relationnels non exposes par le
 * backend Laravel immutable sont rendus defensivement par un tiret.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { LevelApi } from '../../api/LevelApi'
import { useNotification } from '../../hooks/useNotification'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge, LoadingSpinner } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import {
  normalizeApiList,
  normalizeApiPagination,
  relationName,
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
 * Page de liste des niveaux.
 * @returns {import('react').JSX.Element}
 */
export default function LevelsListPage() {
  const notify = useNotification()

  const [levels, setLevels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchLevels = useCallback(async () => {
    setError(null)
    try {
      const response = await LevelApi.list()
      setLevels(normalizeApiList(response))
      setPagination(normalizeApiPagination(response))
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement des niveaux.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = await LevelApi.list()
        if (cancelled) return
        setLevels(normalizeApiList(response))
        setPagination(normalizeApiPagination(response))
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement des niveaux.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const filteredLevels = levels.filter((level) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (level.name && level.name.toLowerCase().includes(q)) ||
      (level.code && level.code.toLowerCase().includes(q)) ||
      (relationName(level, 'department') && relationName(level, 'department').toLowerCase().includes(q))
    )
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await LevelApi.delete(deleteTarget.id)
      notify.success(`Niveau "${deleteTarget.name}" supprime.`)
      setLevels((prev) => prev.filter((l) => l.id !== deleteTarget.id))
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
        title="Niveaux"
        subtitle={`${levels.length} niveau${levels.length !== 1 ? 'x' : ''}`}
        actions={
          <Link to={`${ROUTE_PATHS.LEVELS}/create`}>
            <Button variant="primary" size="md">
              <PlusIcon /> Nouveau niveau
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
          placeholder="Rechercher un niveau..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un niveau"
        />
      </div>

      {/* Chargement */}
      {isLoading && (
        <div style={{ padding: 'var(--ax-space-12) 0' }}>
          <LoadingSpinner label="Chargement des niveaux..." />
        </div>
      )}

      {/* Erreur */}
      {error && !isLoading && (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchLevels}>
            Reessayer
          </Button>
        </div>
      )}

      {/* Etat vide */}
      {!isLoading && !error && filteredLevels.length === 0 && (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun niveau trouve</p>
          <p className="ax-empty-state__desc">
            {search
              ? "Aucun resultat pour votre recherche. Essayez avec d'autres termes."
              : 'Commencez par creer votre premier niveau.'}
          </p>
          {!search && (
            <Link to={`${ROUTE_PATHS.LEVELS}/create`}>
              <Button variant="primary" size="md">
                <PlusIcon /> Creer un niveau
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && filteredLevels.length > 0 && (
        <>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Departement</th>
                  <th>Faculte</th>
                  <th>Ordre</th>
                  <th>Statut</th>
                  <th>Semestres</th>
                  <th className="ax-table__actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLevels.map((level) => {
                  const departmentName = relationName(level, 'department')
                  const facultyName = relationName(level, 'faculty') || relationName(level.department, 'faculty')
                  const semesters = countOf(level, { countKey: 'semesters_count', arrayKey: 'semesters' })
                  return (
                    <tr key={level.id}>
                      <td className="ax-table__cell--strong">{level.name}</td>
                      <td>
                        {level.code ? (
                          <Badge variant="primary" size="sm">{level.code}</Badge>
                        ) : (
                          <span className="ax-text-tertiary">-</span>
                        )}
                      </td>
                      <td className="ax-table__cell--secondary">{departmentName || '-'}</td>
                      <td className="ax-table__cell--secondary">{facultyName || '-'}</td>
                      <td>{level.position}</td>
                      <td>
                        <Badge variant={isActiveStatus(level.status) ? 'primary' : 'default'} size="sm">
                          {statusLabel(level.status)}
                        </Badge>
                      </td>
                      <td>
                        {semesters != null ? (
                          <Badge variant="default" size="sm">{semesters}</Badge>
                        ) : (
                          <span className="ax-text-tertiary">-</span>
                        )}
                      </td>
                      <td className="ax-table__cell--actions">
                        <Link
                          to={`${ROUTE_PATHS.LEVELS}/${level.id}/edit`}
                          className="ax-icon-btn ax-icon-btn--sm"
                          aria-label={`Modifier ${level.name}`}
                        >
                          <EditIcon />
                        </Link>
                        <button
                          className="ax-icon-btn ax-icon-btn--sm"
                          onClick={() => setDeleteTarget(level)}
                          aria-label={`Supprimer ${level.name}`}
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
        title="Supprimer le niveau"
        message={`Voulez-vous vraiment supprimer le niveau "${deleteTarget?.name}" ? Cette action est irreversible.`}
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