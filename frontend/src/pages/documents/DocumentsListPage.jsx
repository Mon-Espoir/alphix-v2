/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Documents List Page
 * ---------------------------------------------------------------------------
 * Bibliotheque : pagination serveur (Laravel), recherche instantanee, tri,
 * filtres multi-facettes (API + client), bascule cartes/tableau, skeletons,
 * retry et etats vides polis.
 */

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DocumentApi } from '../../api/DocumentApi'
import { SearchApi } from '../../api/SearchApi'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { SemesterApi } from '../../api/SemesterApi'
import { CourseApi } from '../../api/CourseApi'
import { DocumentTagApi } from '../../api/DocumentTagApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import DocumentGrid from '../../components/documents/DocumentGrid'
import DocumentTable from '../../components/documents/DocumentTable'
import DocumentToolbar from '../../components/documents/DocumentToolbar'
import DocumentPagination from '../../components/documents/DocumentPagination'
import DocumentSearchBar from '../../components/documents/DocumentSearchBar'
import DocumentFilters from '../../components/documents/DocumentFilters'
import { normalizeApiList, normalizeApiPagination } from '../../utils/academic'
import { buildSearchParams, applyClientFilters, sortDocuments } from '../../utils/document'

/** Taille de page cote client pour le mode recherche avancee. */
const CLIENT_PAGE_SIZE = 15

/** Filtres neutres. */
const DEFAULT_FILTERS = Object.freeze({
  facultyId: '',
  departmentId: '',
  levelId: '',
  semesterId: '',
  courseId: '',
  tagId: '',
  docType: '',
  visibility: '',
  fromDate: '',
  toDate: '',
  minDownloads: '',
  minViews: '',
})

/**
 * Page de liste des documents.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentsListPage() {
  const [references, setReferences] = useState({
    faculties: [],
    departments: [],
    levels: [],
    semesters: [],
    courses: [],
    tags: [],
  })
  const [documents, setDocuments] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [view, setView] = useState('grid')
  const [sortBy, setSortBy] = useState('newest')
  /** Nonce de relance manuelle (bouton Reessayer) — force le re-fetch. */
  const [reloadNonce, setReloadNonce] = useState(0)

  // References de filtrage (donnees reelles API, une seule fois).
  useEffect(() => {
    let cancelled = false
    async function run() {
      const results = await Promise.allSettled([
        FacultyApi.list(),
        DepartmentApi.list(),
        LevelApi.list(),
        SemesterApi.list(),
        DocumentTagApi.list(),
      ])
      if (cancelled) return
      const valueOf = (index) =>
        results[index].status === 'fulfilled' ? normalizeApiList(results[index].value) : []
      let courses = []
      const firstDepartment = valueOf(1)[0]
      if (firstDepartment?.id != null) {
        try {
          courses = normalizeApiList(await CourseApi.getByDepartment(firstDepartment.id))
        } catch {
          courses = []
        }
      }
      if (cancelled) return
      setReferences({
        faculties: valueOf(0),
        departments: valueOf(1),
        levels: valueOf(2),
        semesters: valueOf(3),
        tags: valueOf(4),
        courses,
      })
    }
    run()
    return () => { cancelled = true }
  }, [])

  /** Filtres supportes nativement par SearchApi. */
  const hasServerFilters = Boolean(
    submittedQuery.trim() ||
    filters.facultyId ||
    filters.departmentId ||
    filters.docType ||
    filters.visibility,
  )

  useEffect(() => {
    let cancelled = false
    async function run() {
      setIsLoading(true)
      setError(null)
      try {
        let response
        if (hasServerFilters) {
          // Recherche avancee : facettes serveur (contrat SearchDocumentRequest).
          response = await SearchApi.search(
            buildSearchParams({
              query: submittedQuery.trim() || 'a',
              facultyId: filters.facultyId,
              departmentId: filters.departmentId,
              docType: filters.docType,
              visibility: filters.visibility,
            }),
          )
        } else {
          // Liste par defaut : pagination serveur Laravel.
          response = await DocumentApi.list({ page })
        }
        if (cancelled) return
        const list = normalizeApiList(response)
        setDocuments(list)
        setPagination(hasServerFilters ? null : normalizeApiPagination(response))
      } catch (err) {
        if (!cancelled) {
          setDocuments([])
          setError(err?.message || 'Erreur lors du chargement des documents.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [page, hasServerFilters, submittedQuery, filters.facultyId, filters.departmentId, filters.docType, filters.visibility, reloadNonce])

  /** Pipeline memoise : facettes client puis tri. */
  const visibleDocuments = useMemo(
    () => sortDocuments(applyClientFilters(documents, filters), sortBy),
    [documents, filters, sortBy],
  )

  const pagedDocuments = hasServerFilters
    ? visibleDocuments.slice((page - 1) * CLIENT_PAGE_SIZE, page * CLIENT_PAGE_SIZE)
    : visibleDocuments

  const handleFilterChange = (patch) => {
    if (patch.reset) {
      setFilters(DEFAULT_FILTERS)
      setPage(1)
      return
    }
    setFilters((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }

  const handleSubmitSearch = (value) => {
    setSubmittedQuery(value)
    setSearch(value)
    setPage(1)
  }

  return (
    <Container>
      <PageHeader
        title="Bibliotheque"
        subtitle="Explorez les documents de la plateforme"
        actions={
          <Link to={`${ROUTE_PATHS.DOCUMENTS}/create`}>
            <Button variant="primary" size="md">+ Nouveau document</Button>
          </Link>
        }
      />

      {/* Recherche instantanee */}
      <DocumentSearchBar
        value={search}
        onChange={setSearch}
        onSubmit={handleSubmitSearch}
      />

      {/* Filtres multi-facettes */}
      <DocumentFilters
        faculties={references.faculties}
        departments={references.departments}
        levels={references.levels}
        semesters={references.semesters}
        courses={references.courses}
        tags={references.tags}
        filters={filters}
        onChange={handleFilterChange}
      />

      {/* Barre d'outils : vue + tri + compteur */}
      <DocumentToolbar
        view={view}
        onViewChange={(nextView) => { setView(nextView); setPage(1) }}
        sortBy={sortBy}
        onSortChange={(value) => { setSortBy(value); setPage(1) }}
        total={visibleDocuments.length}
      />

      {/* Chargement (skeletons) */}
      {isLoading && (
        <div className="ax-doc-grid" aria-busy="true" aria-label="Chargement des documents">
          {[1, 2, 3].map((key) => (
            <div key={key} className="ax-card ax-card--padded ax-doc-skeleton">
              <span className="ax-doc-skeleton__line" />
              <span className="ax-doc-skeleton__line ax-doc-skeleton__line--wide" />
              <span className="ax-doc-skeleton__line" />
            </div>
          ))}
        </div>
      )}

      {/* Erreur avec relance */}
      {error && !isLoading && (
        <div className="ax-alert ax-alert--error" role="alert">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadNonce((n) => n + 1)}>
            Reessayer
          </Button>
        </div>
      )}

      {/* Etat vide poli */}
      {!isLoading && !error && pagedDocuments.length === 0 && (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun document trouve</p>
          <p className="ax-empty-state__desc">
            Ajustez votre recherche ou vos filtres pour explorer la bibliotheque.
          </p>
        </div>
      )}

      {/* Resultats */}
      {!isLoading && !error && pagedDocuments.length > 0 && (
        <>
          {view === 'grid' ? (
            <DocumentGrid documents={pagedDocuments} />
          ) : (
            <DocumentTable documents={pagedDocuments} />
          )}
          <DocumentPagination
            currentPage={page}
            lastPage={hasServerFilters
              ? Math.max(1, Math.ceil(visibleDocuments.length / CLIENT_PAGE_SIZE))
              : (pagination?.lastPage ?? 1)}
            total={visibleDocuments.length}
            onPageChange={setPage}
          />
        </>
      )}
    </Container>
  )
}