/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Document Search Page
 * ---------------------------------------------------------------------------
 * Moteur de recherche global : requete serveur (SearchApi), suggestions,
 * historique local des recherches recentes (session), requetes populaires
 * (API) et filtres granulaires multi-niveaux.
 */

import { useState, useEffect, useMemo } from 'react'
import { SearchApi } from '../../api/SearchApi'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { DocumentTagApi } from '../../api/DocumentTagApi'
import { Container, Button, Card, Badge } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import DocumentGrid from '../../components/documents/DocumentGrid'
import DocumentPagination from '../../components/documents/DocumentPagination'
import DocumentSearchBar from '../../components/documents/DocumentSearchBar'
import DocumentFilters from '../../components/documents/DocumentFilters'
import { useNotification } from '../../hooks/useNotification'
import { normalizeApiList } from '../../utils/academic'
import { buildSearchParams } from '../../utils/document'

/** Cle de stockage session de l'historique de recherche. */
const RECENT_KEY = 'alphix:recent-searches'

/**
 * Page de recherche globale de documents.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentSearchPage() {
  const notify = useNotification()

  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [results, setResults] = useState([])
  const [popularQueries, setPopularQueries] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  /** Nonce de relance manuelle (bouton Reessayer) — force le re-fetch. */
  const [reloadNonce, setReloadNonce] = useState(0)

  /** Historique recent lu une seule fois depuis la session (aucune donnee fabriquee). */
  const [recentQueries, setRecentQueries] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem(RECENT_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.slice(0, 6) : []
    } catch {
      return []
    }
  })

  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [tags, setTags] = useState([])
  const [filters, setFilters] = useState({ facultyId: '', departmentId: '', docType: '' })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // References + requetes populaires (echecs silencieux, non bloquants).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const popular = await SearchApi.getPopularQueries({ limit: 8 })
        if (!cancelled) setPopularQueries(normalizeApiList(popular))
      } catch {
        if (!cancelled) setPopularQueries([])
      }
      try {
        const facs = await FacultyApi.list()
        if (!cancelled) setFaculties(normalizeApiList(facs))
      } catch {
        if (!cancelled) setFaculties([])
      }
      try {
        const deps = await DepartmentApi.list()
        if (!cancelled) setDepartments(normalizeApiList(deps))
      } catch {
        if (!cancelled) setDepartments([])
      }
      try {
        const tagList = await DocumentTagApi.list()
        if (!cancelled) setTags(normalizeApiList(tagList))
      } catch {
        if (!cancelled) setTags([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  /** Recherche serveur a la soumission (contrat Laravel : query requis). */
  useEffect(() => {
    if (!hasSearched || !submittedQuery.trim()) return undefined
    let cancelled = false
    async function run() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await SearchApi.search(buildSearchParams({
          query: submittedQuery,
          facultyId: filters.facultyId,
          departmentId: filters.departmentId,
          docType: filters.docType,
        }))
        if (cancelled) return
        setResults(normalizeApiList(response))
      } catch (err) {
        if (!cancelled) {
          setResults([])
          setError(err?.message || 'Erreur lors de la recherche.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [hasSearched, submittedQuery, filters.facultyId, filters.departmentId, filters.docType, reloadNonce])

  /**
   * Soumission : enregistre l'historique recent en session puis recherche.
   * @param {string} value - Requete saisie.
   */
  const handleSearchSubmit = (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      notify.warning('Veuillez saisir un terme de recherche.')
      return
    }
    const nextRecent = [trimmed, ...recentQueries.filter((item) => item !== trimmed)].slice(0, 6)
    setRecentQueries(nextRecent)
    try {
      window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent))
    } catch {
      // Stockage indisponible (mode prive) : degrade silencieux.
    }
    setQuery(trimmed)
    setSubmittedQuery(trimmed)
    setPage(1)
    setHasSearched(true)
  }

  /** Suggestions dedupliquees (populaires + recentes). */
  const suggestions = useMemo(() => {
    const labels = [
      ...popularQueries.map((entry) => entry?.query).filter(Boolean),
      ...recentQueries,
    ]
    return [...new Set(labels)]
  }, [popularQueries, recentQueries])

  return (
    <Container>
      <PageHeader
        title="Recherche"
        subtitle="Recherchez dans toute la bibliotheque ALPHIX"
      />

      <DocumentSearchBar
        value={query}
        onChange={setQuery}
        onSubmit={handleSearchSubmit}
        suggestions={suggestions}
        placeholder="Rechercher par titre, cours, mot-cle..."
      />

      {/* Recherches recentes + populaires */}
      <div className="ax-doc-toolbar">
        {recentQueries.length > 0 && (
          <div className="ax-doc-tags" aria-label="Recherches recentes">
            <Badge variant="default" size="sm">Recentes :</Badge>
            {recentQueries.map((item) => (
              <button
                key={item}
                type="button"
                className="ax-icon-btn ax-icon-btn--sm"
                onClick={() => handleSearchSubmit(item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {popularQueries.length > 0 && (
          <div className="ax-doc-tags" aria-label="Recherches populaires">
            <Badge variant="primary" size="sm">Populaires :</Badge>
            {popularQueries.map((entry) => (
              <button
                key={entry.id ?? entry.query}
                type="button"
                className="ax-icon-btn ax-icon-btn--sm"
                onClick={() => handleSearchSubmit(entry.query)}
              >
                {entry.query} ({entry.results_count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtres granulaires */}
      <DocumentFilters
        faculties={faculties}
        departments={departments}
        tags={tags}
        filters={filters}
        onChange={(patch) => {
          setFilters((prev) => ({ ...prev, ...patch }))
          setPage(1)
        }}
      />

      {!hasSearched && !isLoading && (
        <Card className="ax-card--padded">
          <p style={{ margin: 0, color: 'var(--ax-text-secondary)' }}>
            Saisissez un terme puis validez pour lancer la recherche.
          </p>
        </Card>
      )}

      {isLoading && (
        <div className="ax-doc-grid" aria-busy="true">
          {[1, 2, 3].map((key) => (
            <div key={key} className="ax-card ax-card--padded ax-doc-skeleton" role="status">
              <span className="ax-doc-skeleton__line ax-doc-skeleton__line--wide" />
              <span className="ax-doc-skeleton__line" />
            </div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="ax-alert ax-alert--error" role="alert">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadNonce((n) => n + 1)}>
            Reessayer
          </Button>
        </div>
      )}

      {hasSearched && !isLoading && !error && results.length === 0 && (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun resultat</p>
          <p className="ax-empty-state__desc">Essayez d'elargir vos criteres de recherche.</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="ax-doc-toolbar__count" aria-live="polite">
            {`${results.length} resultat${results.length !== 1 ? 's' : ''}`}
          </p>
          <DocumentGrid documents={results.slice((page - 1) * 15, page * 15)} />
          <DocumentPagination
            currentPage={page}
            lastPage={Math.max(1, Math.ceil(results.length / 15))}
            total={results.length}
            onPageChange={setPage}
          />
        </>
      )}
    </Container>
  )
}