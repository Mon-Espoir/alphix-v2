/* eslint-disable react-hooks/set-state-in-effect */
/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Recherche unifiée Cours + Documents (mobile-first)
 * ---------------------------------------------------------------------------
 * - Barre de recherche globale (cours ET documents, tolérante accents/fautes via backend)
 * - Filtres docType exclusifs vs recherche : taper efface le filtre actif qui masquerait
 * - Résultats séparés en deux sections nettes : Cours | Documents (jamais mutuellement exclusifs)
 * - Fallback fuzzy + IA invisible, état vide intelligent avec reset en 1 tap
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CourseApi } from '../../api/CourseApi'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { SemesterApi } from '../../api/SemesterApi'
import { DocumentTagApi } from '../../api/DocumentTagApi'
import { Container, Button, Card, Badge } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import DocumentSearchBar from '../../components/documents/DocumentSearchBar'
import DocumentFilters from '../../components/documents/DocumentFilters'
import CourseCard from '../../components/documents/CourseCard'
import { ROUTE_PATHS } from '../../constants/routes'
import { useNotification } from '../../hooks/useNotification'
import { SearchApi } from '../../api/SearchApi'
import { normalizeApiList, resolveCourseIds, resolveDepartmentFacultyId, toSelectOptions } from '../../utils/academic'
import { emptyFilters } from '../../utils/document'
import { cachedAcademicList } from '../../utils/academicCache'
import { hasAdminAccess } from '../../utils/admin'
import { useAuth } from '../../hooks/useAuth'

const RECENT_KEY = 'alphix:recent-searches'

function readRecentQueries() {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY) ?? window.sessionStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, 6) : []
  } catch {
    return []
  }
}

function writeRecentQueries(queries) {
  const raw = JSON.stringify(queries)
  try {
    window.localStorage.setItem(RECENT_KEY, raw)
    try { window.sessionStorage.removeItem(RECENT_KEY) } catch { void 0 }
  } catch {
    try { window.sessionStorage.setItem(RECENT_KEY, raw) } catch { void 0 }
  }
}

export default function DocumentSearchPage() {
  const notify = useNotification()
  const { user } = useAuth()
  const isAdmin = hasAdminAccess(user)
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [courses, setCourses] = useState([])
  const [popularQueries, setPopularQueries] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [recentQueries, setRecentQueries] = useState(() => readRecentQueries())
  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [tags, setTags] = useState([])
  const [levels, setLevels] = useState([])
  const [semesters, setSemesters] = useState([])
  const [allCourses, setAllCourses] = useState([])
  const [filters, setFilters] = useState(() => emptyFilters())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  // Documents unifiés (SearchApi) — indépendants des cours, jamais masqués par l'autre section
  const [docResults, setDocResults] = useState([])
  const [isDocLoading, setIsDocLoading] = useState(false)
  const [docError, setDocError] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [fallbackUsed, setFallbackUsed] = useState(false)
  const resultsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const [facs, deps, t, levs, sems, all] = await Promise.all([
        cachedAcademicList('faculties', () => FacultyApi.list()),
        cachedAcademicList('departments', () => DepartmentApi.list()),
        cachedAcademicList('document-tags', () => DocumentTagApi.list()),
        cachedAcademicList('levels', () => LevelApi.list()),
        cachedAcademicList('semesters', () => SemesterApi.list()),
        cachedAcademicList('courses', () => CourseApi.list()),
      ])
      if (!cancelled) {
        setFaculties(facs)
        setDepartments(deps)
        setTags(t)
        setLevels(levs)
        setSemesters(sems)
        setAllCourses(all)
      }
      try {
        const res = await SearchApi.getPopularQueries()
        const rows = Array.isArray(res) ? res : (res?.data ?? [])
        const pop = (rows || []).map((e) => ({ query: e?.query, results_count: Number(e?.results_count ?? 0) })).filter((e) => Boolean(e.query))
        if (!cancelled) setPopularQueries(pop)
      } catch { if (!cancelled) setPopularQueries([]) }
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (query.trim() === '') {
      setCourses([])
      setDocResults([])
      setHasSearched(false)
      setError(null)
      setDocError(null)
    }
  }, [query])

  useEffect(() => {
    if (hasSearched && query.trim() !== submittedQuery.trim() && query.trim() !== '') {
      setCourses([])
    }
  }, [query, submittedQuery, hasSearched])

  // --- Recherche COURS (tolérante via CourseRepository normalizeText) ---
  useEffect(() => {
    const term = submittedQuery.trim()
    const activeFilter = filters.facultyId || filters.departmentId || filters.levelId || filters.semesterId || filters.courseId
    if ((!hasSearched && !activeFilter) || (hasSearched && !term && !activeFilter)) return undefined
    let cancelled = false
    async function run() {
      setCourses([])
      setError(null)
      setIsLoading(true)
      try {
        let list
        if (term) {
          const res = await CourseApi.search({ q: term, query: term })
          list = normalizeApiList(res)
        } else {
          list = await cachedAcademicList('courses', () => CourseApi.list())
        }
        const courseIdOf = (item) => resolveCourseIds(item)
        if (filters.facultyId) list = list.filter((item) => courseIdOf(item).facultyId === String(filters.facultyId))
        if (filters.departmentId) list = list.filter((item) => courseIdOf(item).departmentId === String(filters.departmentId))
        if (filters.levelId) list = list.filter((item) => courseIdOf(item).levelId === String(filters.levelId))
        if (filters.semesterId) list = list.filter((item) => courseIdOf(item).semesterId === String(filters.semesterId))
        if (filters.courseId) list = list.filter((item) => String(item.id) === String(filters.courseId))
        const deduped = [...new Map(list.map((c) => [String(c.id ?? c.code), c])).values()]
        if (!cancelled) setCourses(deduped)
      } catch (err) {
        if (!cancelled) { setCourses([]); setError(err?.message || 'Erreur lors de la recherche.') }
      } finally { if (!cancelled) setIsLoading(false) }
    }
    run()
    return () => { cancelled = true }
  }, [hasSearched, submittedQuery, filters.facultyId, filters.departmentId, filters.levelId, filters.semesterId, filters.courseId])

  // --- Recherche DOCUMENTS unifiée (SQL + fuzzy + IA fallback) ---
  useEffect(() => {
    const term = submittedQuery.trim()
    // Documents visibles dès qu'une recherche est lancée OU qu'un filtre doc est actif
    const shouldSearchDocs = hasSearched && term !== '' || Boolean(filters.docType)
    if (!shouldSearchDocs) {
      setDocResults([])
      setAiSuggestions([])
      setFallbackUsed(false)
      setDocError(null)
      return undefined
    }
    let cancelled = false
    async function run() {
      setIsDocLoading(true)
      setDocError(null)
      setAiSuggestions([])
      setFallbackUsed(false)
      try {
        // Groupe "TP / TD" et "Syllabus / Cours" nécessitent un post-filtrage client
        const groupMap = {
          'syllabus_course': ['syllabus', 'course'],
          'tp_td': ['tp', 'td'],
        }
        const isGroup = groupMap[filters.docType]
        const apiDocType = isGroup ? undefined : (filters.docType || undefined)
        const params = { query: term || undefined, doc_type: apiDocType, per_page: 50 }
        // Nettoie les params vides
        Object.keys(params).forEach((k) => params[k] === undefined && delete params[k])
        const res = await SearchApi.search(params)
        let list = normalizeApiList(res)
        // Groupe : filtre client
        if (isGroup) {
          list = list.filter((d) => groupMap[filters.docType].includes(String(d.doc_type)))
        }
        // Meta IA / fallback
        const suggestions = res?.ai_suggestions ?? res?.additional?.ai_suggestions ?? []
        const fallback = res?.fallback ?? res?.additional?.fallback
        if (!cancelled) {
          setDocResults(list)
          if (Array.isArray(suggestions) && suggestions.length) setAiSuggestions(suggestions.slice(0, 6))
          if (fallback) setFallbackUsed(true)
        }
      } catch (err) {
        if (!cancelled) { setDocResults([]); setDocError(err?.message || 'Erreur documents.') }
      } finally { if (!cancelled) setIsDocLoading(false) }
    }
    run()
    return () => { cancelled = true }
  }, [hasSearched, submittedQuery, filters.docType])

  useEffect(() => {
    if ((courses.length > 0 || docResults.length > 0) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [courses, docResults, isLoading, isDocLoading])

  const handleSearchSubmit = (value) => {
    const trimmed = value.trim()
    if (!trimmed) { notify.warning('Veuillez saisir un terme de recherche.'); return }
    // Exclusivité : taper du texte réinitialise le filtre docType qui masquerait les résultats
    if (filters.docType) {
      setFilters((prev) => ({ ...prev, docType: '' }))
    }
    const nextRecent = [trimmed, ...recentQueries.filter((item) => item !== trimmed)].slice(0, 6)
    setRecentQueries(nextRecent)
    writeRecentQueries(nextRecent)
    setQuery(trimmed)
    setSubmittedQuery(trimmed)
    setHasSearched(true)
  }

  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q.trim() && !hasSearched) {
      const trimmed = q.trim()
      const nextRecent = [trimmed, ...recentQueries.filter((item) => item !== trimmed)].slice(0, 6)
      setRecentQueries(nextRecent)
      writeRecentQueries(nextRecent)
      setQuery(trimmed)
      setSubmittedQuery(trimmed)
      setHasSearched(true)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDocumentOpen = () => { setCourses([]); setHasSearched(false) }

  const suggestions = useMemo(() => {
    const labels = [...popularQueries.map((e) => e?.query).filter(Boolean), ...recentQueries]
    return [...new Set(labels)]
  }, [popularQueries, recentQueries])

  const searched = hasSearched || Boolean(filters.facultyId || filters.departmentId || filters.levelId || filters.semesterId || filters.courseId || filters.docType)
  const showEmpty = searched && !isLoading && !isDocLoading && !error && !docError && courses.length === 0 && docResults.length === 0

  const fdCourses = useMemo(() => allCourses.filter((c) => {
    const ids = resolveCourseIds(c)
    if (filters.facultyId && ids.facultyId !== String(filters.facultyId)) return false
    if (filters.departmentId && ids.departmentId !== String(filters.departmentId)) return false
    return true
  }), [allCourses, filters.facultyId, filters.departmentId])
  const availableLevels = useMemo(() => levels.filter((l) => fdCourses.some((c) => resolveCourseIds(c).levelId === String(l.id))), [levels, fdCourses])
  const availableSemesters = useMemo(() => semesters.filter((s) => fdCourses.some((c) => resolveCourseIds(c).semesterId === String(s.id))), [semesters, fdCourses])
  const courseOptions = useMemo(() => {
    let base = fdCourses
    if (filters.levelId) base = base.filter((c) => resolveCourseIds(c).levelId === String(filters.levelId))
    if (filters.semesterId) base = base.filter((c) => resolveCourseIds(c).semesterId === String(filters.semesterId))
    return toSelectOptions(base, { labelKey: 'name' }).map((o) => {
      const course = base.find((c) => String(c.id) === String(o.value))
      return { value: o.value, label: `${course?.code ? `${course.code} — ` : ''}${o.label}` }
    })
  }, [fdCourses, filters.levelId, filters.semesterId])
  const displayedDepartments = useMemo(() => (filters.facultyId ? departments.filter((d) => resolveDepartmentFacultyId(d) === String(filters.facultyId)) : departments), [departments, filters.facultyId])

  const resetAll = () => {
    setFilters(emptyFilters())
    setQuery('')
    setSubmittedQuery('')
    setHasSearched(false)
    setCourses([])
    setDocResults([])
    setError(null)
    setDocError(null)
  }

  return (
    <Container>
      <PageHeader title="Recherche" subtitle="Cours et documents — tolérante aux fautes, accents et acronymes" />
      <DocumentSearchBar value={query} onChange={setQuery} onSubmit={handleSearchSubmit} suggestions={suggestions} placeholder="Rechercher un cours ou un document (ex: hetero, cinetique, pharmacog)..." />
      <div className="ax-doc-toolbar">
        {recentQueries.length > 0 && (
          <div className="ax-doc-tags" aria-label="Recherches recentes">
            <Badge variant="default" size="sm">Récentes :</Badge>
            {recentQueries.map((item) => (<button key={item} type="button" className="ax-icon-btn ax-icon-btn--sm" onClick={() => handleSearchSubmit(item)}>{item}</button>))}
          </div>
        )}
        {popularQueries.length > 0 && (
          <div className="ax-doc-tags" aria-label="Recherches populaires">
            <Badge variant="primary" size="sm">Populaires :</Badge>
            {popularQueries.map((entry) => (<button key={entry.query} type="button" className="ax-icon-btn ax-icon-btn--sm" onClick={() => handleSearchSubmit(entry.query)}>{entry.query}</button>))}
          </div>
        )}
      </div>
      <DocumentFilters
        faculties={faculties}
        departments={displayedDepartments}
        allDepartments={departments}
        allLevels={levels}
        levels={availableLevels}
        semesters={availableSemesters}
        courses={courseOptions}
        tags={tags}
        filters={filters}
        onChange={(patch) => {
          if (patch.reset) { setFilters(emptyFilters()); return }
          // Changement de filtre : mise à jour instantanée, sans délai
          if (patch.facultyId !== undefined && patch.facultyId !== filters.facultyId) {
            setFilters((prev) => ({ ...prev, facultyId: patch.facultyId, departmentId: '', levelId: '', semesterId: '', courseId: '' }))
            return
          }
          if (patch.departmentId !== undefined && patch.departmentId !== filters.departmentId) {
            setFilters((prev) => ({ ...prev, departmentId: patch.departmentId, levelId: '', semesterId: '', courseId: '' }))
            return
          }
          // Exclusivité inverse : choisir un filtre docType garde la recherche mais filtre les docs instantanément
          setFilters((prev) => ({ ...prev, ...patch }))
        }}
      />

      <div ref={resultsRef} />

      {!searched && !isLoading && !isDocLoading && (
        <Card className="ax-card--padded"><p style={{ margin: 0, color: 'var(--ax-text-secondary)' }}>Tapez un mot-clé puis Entrée — la recherche parcourt cours, titres de documents et descriptions (accents et fautes tolérés). Filtrez ensuite par catégorie en un tap.</p></Card>
      )}
      {(isLoading || isDocLoading) && (
        <div className="ax-doc-grid" aria-busy="true">
          {[1, 2, 3].map((k) => (<div key={k} className="ax-card ax-card--padded ax-doc-skeleton" role="status"><span className="ax-doc-skeleton__line ax-doc-skeleton__line--wide" /><span className="ax-doc-skeleton__line" /></div>))}
        </div>
      )}
      {error && !isLoading && (<div className="ax-alert ax-alert--error" role="alert"><p>{error}</p><Button variant="outline" size="sm" onClick={() => handleSearchSubmit(submittedQuery)}>Réessayer</Button></div>)}
      {docError && !isDocLoading && (<div className="ax-alert ax-alert--error" role="alert"><p>{docError}</p></div>)}

      {showEmpty && (
        <div className="ax-empty-state ax-empty-state--search">
          <p className="ax-empty-state__title">Aucun résultat pour « {submittedQuery} »</p>
          <p className="ax-empty-state__desc">Vérifiez l'orthographe, essayez un synonyme (ex: « hetero » pour hétérocyclique, « cinetique » sans accent, « pharmacog ») ou élargissez les filtres.</p>
          {(filters.docType || filters.facultyId || filters.departmentId) && (<p className="ax-empty-state__hint">Un filtre actif peut masquer des résultats.</p>)}
          <div style={{ display: 'flex', gap: 'var(--ax-space-2)', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--ax-space-4)' }}>
            <Button variant="primary" size="md" onClick={resetAll}>Réinitialiser les filtres</Button>
            <Button variant="ghost" size="md" onClick={() => { setFilters((p) => ({ ...p, docType: '' })); }}>Voir tout</Button>
          </div>
          {aiSuggestions.length > 0 && (
            <div style={{ marginTop: 'var(--ax-space-4)' }}>
              <p style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-secondary)', marginBottom: 'var(--ax-space-2)' }}>Essayez aussi :</p>
              <div style={{ display: 'flex', gap: 'var(--ax-space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
                {aiSuggestions.map((s, i) => (<button key={i} type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={() => handleSearchSubmit(s.label || s)}>{s.label || s}</button>))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section COURS — toujours visible quand il y a une recherche, jamais masquée par les filtres doc */}
      {searched && !isLoading && courses.length > 0 && (
        <section aria-label="Cours" style={{ marginTop: 'var(--ax-space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', marginBottom: 'var(--ax-space-3)', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'var(--ax-text-lg)', fontWeight: 'var(--ax-font-bold)', margin: 0 }}>📚 Cours</h2>
            <Badge variant="primary" size="sm">{courses.length} trouvé{courses.length !== 1 ? 's' : ''}</Badge>
            <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-tertiary)' }}>— touchez pour voir les documents du cours</span>
          </div>
          <div className="ax-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--ax-space-4)' }}>
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                levels={levels}
                semesters={semesters}
                isAdmin={isAdmin}
                addLabel="Ajouter"
                onSelect={handleDocumentOpen}
                style={{ borderLeft: '4px solid var(--ax-primary)' }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section DOCUMENTS — distincte, avec fallback indicator */}
      {searched && !isDocLoading && docResults.length > 0 && (
        <section aria-label="Documents" style={{ marginTop: 'var(--ax-space-6)', paddingTop: 'var(--ax-space-4)', borderTop: '2px solid var(--ax-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', marginBottom: 'var(--ax-space-3)', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'var(--ax-text-lg)', fontWeight: 'var(--ax-font-bold)', margin: 0 }}>📄 Documents</h2>
            <Badge variant="primary" size="sm">{docResults.length} trouvé{docResults.length !== 1 ? 's' : ''}</Badge>
            {fallbackUsed && (<Badge variant="default" size="sm">Résultats proches (fautes tolérées)</Badge>)}
            {filters.docType && (<span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-secondary)' }}>— filtré : {filters.docType}</span>)}
          </div>
          <div style={{ display: 'grid', gap: 'var(--ax-space-3)' }}>
            {docResults.map((doc) => (
              <div key={doc.id} className="ax-card ax-card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--ax-space-3)', flexWrap: 'wrap', borderLeft: '4px solid var(--ax-success)' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 'var(--ax-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge variant="primary" size="sm">{doc.doc_type || 'document'}</Badge>
                    {doc.course?.name && (<Badge variant="default" size="sm">{doc.course.code ? `${doc.course.code} • ` : ''}{doc.course.name}</Badge>)}
                  </div>
                  <h3 style={{ fontSize: 'var(--ax-text-base)', fontWeight: 'var(--ax-font-semibold)', margin: 'var(--ax-space-2) 0 var(--ax-space-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</h3>
                  <p style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-tertiary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.original_name || ''} {doc.file_size ? `• ${(Number(doc.file_size) / 1048576).toFixed(1)} Mo` : ''} {` • ${doc.views_count ?? 0} vues • ${doc.downloads_count ?? 0} téléchargements`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--ax-space-2)', flexShrink: 0 }}>
                  <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}`} className="ax-btn ax-btn--ghost ax-btn--sm">Fiche</Link>
                  <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}/preview`} className="ax-btn ax-btn--secondary ax-btn--sm">Aperçu</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {searched && !isDocLoading && docResults.length === 0 && courses.length > 0 && (
        <p style={{ marginTop: 'var(--ax-space-4)', fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-secondary)', textAlign: 'center' }}>Aucun document ne correspond au filtre actuel — les {courses.length} cours ci-dessus restent visibles. <button type="button" className="ax-link" onClick={() => setFilters((p) => ({ ...p, docType: '' }))} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>Effacer le filtre</button></p>
      )}
    </Container>
  )
}
