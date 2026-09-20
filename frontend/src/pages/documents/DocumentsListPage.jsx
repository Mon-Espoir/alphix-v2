/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Explorer / Bibliothèque (Cours comme source principale)
 * ---------------------------------------------------------------------------
 * Source principale : table courses (867 cours) avec LEFT JOIN documents
 * pour afficher le compteur réel (0,1,5...). Chaque cours est navigable
 * même sans document. Recherche retourne des cours.
 */

import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CourseApi } from '../../api/CourseApi'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { SemesterApi } from '../../api/SemesterApi'
import { DocumentTagApi } from '../../api/DocumentTagApi'
import { DocumentApi } from '../../api/DocumentApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { Container, Button, Badge } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import DocumentSearchBar from '../../components/documents/DocumentSearchBar'
import DocumentFilters from '../../components/documents/DocumentFilters'
import DownloadButton from '../../components/documents/DownloadButton'
import FavoriteButton from '../../components/documents/FavoriteButton'
import TeacherBadge from '../../components/documents/TeacherBadge'
import CourseCard from '../../components/documents/CourseCard'
import { normalizeApiList, resolveCourseIds, resolveDepartmentFacultyId, toSelectOptions, semesterLabel } from '../../utils/academic'
import { applyDocLevelFilters, docLevelFiltersActive, emptyFilters } from '../../utils/document'
import { cachedAcademicList } from '../../utils/academicCache'
import { hasAdminAccess } from '../../utils/admin'
import { useAuth } from '../../hooks/useAuth'

export default function DocumentsListPage() {
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('course_id')
  const { user } = useAuth()
  const isAdmin = hasAdminAccess(user)
  const [course, setCourse] = useState(null)
  const [courseDocuments, setCourseDocuments] = useState([])
  const [references, setReferences] = useState({
    faculties: [],
    departments: [],
    levels: [],
    semesters: [],
    tags: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [filters, setFilters] = useState(() => emptyFilters())
  const [reloadNonce, setReloadNonce] = useState(0)
  const [rawCourses, setRawCourses] = useState([])
  const [docResults, setDocResults] = useState([])
  const [isDocLoading, setIsDocLoading] = useState(false)

  // Référentiels (cache mémoire : une seule requête par session) + cours.
  useEffect(() => {
    let cancelled = false
    async function run() {
      setIsLoading(true)
      setError(null)
      try {
        const [facs, deps, levs, sems, tags] = await Promise.all([
          cachedAcademicList('faculties', () => FacultyApi.list()),
          cachedAcademicList('departments', () => DepartmentApi.list()),
          cachedAcademicList('levels', () => LevelApi.list()),
          cachedAcademicList('semesters', () => SemesterApi.list()),
          cachedAcademicList('document-tags', () => DocumentTagApi.list()),
        ])
        if (cancelled) return
        setReferences({
          faculties: facs,
          departments: deps,
          levels: levs,
          semesters: sems,
          tags,
        })

        // Source principale : les cours de la base (SQLite), avec compteur.
        // Recherche = API existante ; sinon liste complète mise en cache.
        let list = []
        if (submittedQuery.trim()) {
          const res = await CourseApi.search({ q: submittedQuery.trim() }).catch(() => [])
          list = normalizeApiList(res)
        } else {
          list = await cachedAcademicList('courses', () => CourseApi.list())
        }
        if (cancelled) return
        // La liste brute est gardee en memoire : le filtrage academique est
        // applique localement (useMemo), sans refetch a chaque changement.
        setRawCourses(list)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement des cours.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [submittedQuery, reloadNonce])

  // Filtrage academique local (faculte/departement/niveau/semestre/cours) — instantane.
  const courses = useMemo(() => {
    let filtered = rawCourses
    if (filters.facultyId) {
      filtered = filtered.filter((c) => resolveCourseIds(c).facultyId === String(filters.facultyId))
    }
    if (filters.departmentId) {
      filtered = filtered.filter((c) => resolveCourseIds(c).departmentId === String(filters.departmentId))
    }
    if (filters.levelId) {
      filtered = filtered.filter((c) => resolveCourseIds(c).levelId === String(filters.levelId))
    }
    if (filters.semesterId) {
      filtered = filtered.filter((c) => resolveCourseIds(c).semesterId === String(filters.semesterId))
    }
    if (filters.courseId) {
      filtered = filtered.filter((c) => String(c.id) === String(filters.courseId))
    }
    return filtered
  }, [rawCourses, filters.facultyId, filters.departmentId, filters.levelId, filters.semesterId, filters.courseId])

  // Cascade : base apres faculte/departement, source des niveaux/semestres proposes.
  const fdCourses = useMemo(() => {
    if (!filters.facultyId && !filters.departmentId) return rawCourses
    return rawCourses.filter((c) => {
      const ids = resolveCourseIds(c)
      if (filters.facultyId && ids.facultyId !== String(filters.facultyId)) return false
      if (filters.departmentId && ids.departmentId !== String(filters.departmentId)) return false
      return true
    })
  }, [rawCourses, filters.facultyId, filters.departmentId])

  // 5e maillon de la cascade : les cours proposés suivent faculté/département/BAC/semestre.
  const courseOptions = useMemo(() => {
    let base = fdCourses
    if (filters.levelId) base = base.filter((c) => resolveCourseIds(c).levelId === String(filters.levelId))
    if (filters.semesterId) base = base.filter((c) => resolveCourseIds(c).semesterId === String(filters.semesterId))
    return toSelectOptions(base, { labelKey: 'name' })
      .map((option) => {
        const course = base.find((c) => String(c.id) === String(option.value))
        return { value: option.value, label: `${course?.code ? `${course.code} — ` : ''}${option.label}` }
      })
  }, [fdCourses, filters.levelId, filters.semesterId])

  // Fil d'Ariane hiérarchique : Explorer › Faculté › Département › BAC › Semestre › Cours.
  // Cliquer un maillon remonte d'un ou plusieurs niveaux (sans rechargement).
  const breadcrumb = useMemo(() => {
    const nameOf = (list, id) => list.find((item) => String(item?.id) === String(id))?.name || ''
    const crumbs = [{ label: 'Explorer', to: null, clear: null }]
    if (filters.facultyId) {
      crumbs.push({
        label: nameOf(references.faculties, filters.facultyId) || 'Faculté',
        clear: ['departmentId', 'levelId', 'semesterId', 'courseId'],
      })
    }
    if (filters.departmentId) {
      crumbs.push({
        label: nameOf(references.departments, filters.departmentId) || 'Département',
        clear: ['levelId', 'semesterId', 'courseId'],
      })
    }
    if (filters.levelId) {
      crumbs.push({
        label: nameOf(references.levels, filters.levelId) || 'Niveau',
        clear: ['semesterId', 'courseId'],
      })
    }
    if (filters.semesterId) {
      // Affichage global du semestre filtré (BAC3+S1 => Semestre 5, pas Semestre 1)
      const sem = references.semesters.find((s) => String(s.id) === String(filters.semesterId))
      const lvl = references.levels.find((l) => String(l.id) === String(filters.levelId))
      const semLabel = lvl && sem ? semesterLabel({ level: lvl, semester: sem }) : (sem?.name || 'Semestre')
      crumbs.push({
        label: semLabel || nameOf(references.semesters, filters.semesterId) || 'Semestre',
        clear: ['courseId'],
      })
    }
    if (filters.courseId) {
      const course = rawCourses.find((c) => String(c.id) === String(filters.courseId))
      crumbs.push({ label: course?.code ? `${course.code} — ${course.title || course.name}` : 'Cours', clear: [] })
    }
    return crumbs
  }, [filters, references, rawCourses])

  const goUpTo = (clearKeys) => {
    if (!clearKeys) {
      setFilters(emptyFilters())
      return
    }
    setFilters((prev) => {
      const next = { ...prev }
      for (const key of clearKeys) next[key] = ''
      return next
    })
  }

  // Filtres de niveau document : chargement + filtrage local des documents.
  const docFiltersActive = docLevelFiltersActive(filters)
  useEffect(() => {
    if (!docFiltersActive) {
      // Pas de nettoyage d'etat ici (evite un setState synchrone dans
      // l'effet) : le rendu est deja gate par `docFiltersActive`.
      return undefined
    }
    let cancelled = false
    async function run() {
      setIsDocLoading(true)
      try {
        const res = await DocumentApi.list({ per_page: 100 })
        if (!cancelled) setDocResults(applyDocLevelFilters(normalizeApiList(res), filters))
      } catch {
        if (!cancelled) setDocResults([])
      } finally {
        if (!cancelled) setIsDocLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [docFiltersActive, filters.docType, filters.visibility, filters.tagId, filters.fromDate, filters.toDate, filters.minDownloads, filters.minViews, reloadNonce])

  // Vue "documents d'un cours" : ?course_id=X
  useEffect(() => {
    if (!courseId) return undefined
    let cancelled = false
    async function run() {
      setIsLoading(true)
      setError(null)
      try {
        const [docs, allCourses] = await Promise.all([
          DocumentApi.list({ course_id: courseId, per_page: 100 }).catch(() => []),
          CourseApi.list().catch(() => []),
        ])
        if (cancelled) return
        const docList = normalizeApiList(docs)
        setCourseDocuments(docList)
        const found = normalizeApiList(allCourses).find((c) => String(c.id) === String(courseId))
        setCourse(found || null)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement des documents du cours.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [courseId, reloadNonce])

  const visibleCount = courses.length

  const handleSubmitSearch = (value) => {
    setSubmittedQuery(value.trim())
  }

  // Recherche instantanee : 300 ms apres la derniere frappe, sans attendre Entree.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSubmittedQuery(search.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Cascade : seuls les niveaux/semestres reels du contexte faculte/departement
  // sont proposes (plus de "semestre 10" fantome).
  const availableLevels = references.levels.filter((l) =>
    fdCourses.some((c) => resolveCourseIds(c).levelId === String(l.id)))
  const availableSemesters = references.semesters.filter((s) =>
    fdCourses.some((c) => resolveCourseIds(c).semesterId === String(s.id)))

  if (courseId) {
    return (
      <Container>
        <PageHeader
          title={course ? (course.title || course.name) : 'Documents du cours'}
          subtitle={course ? `${course.code || ''} ${course.department?.name ? '• ' + course.department.name : ''}` : undefined}
          actions={null}
        />
        <Link to={ROUTE_PATHS.DOCUMENTS} className="ax-btn ax-btn--ghost ax-btn--sm" style={{ marginBottom: 'var(--ax-space-4)', display: 'inline-block' }}>
          ← Retour aux cours
        </Link>
        {course && (
          <div style={{ marginBottom: 'var(--ax-space-4)' }}>
            <TeacherBadge course={course} size="md" />
          </div>
        )}
        {isLoading && <p style={{ color: 'var(--ax-text-secondary)' }}>Chargement des documents...</p>}
        {error && !isLoading && (
          <div className="ax-alert ax-alert--error"><p>{error}</p></div>
        )}
        {!isLoading && !error && courseDocuments.length === 0 && (
          <div className="ax-empty-state">
            <p className="ax-empty-state__title">Aucun document pour ce cours</p>
            <p className="ax-empty-state__desc">Les documents approuves du cours apparaitront ici.</p>
          </div>
        )}
        {!isLoading && !error && courseDocuments.length > 0 && (
          <p className="ax-doc-toolbar__count" style={{ fontWeight: 'var(--ax-font-semibold)' }}>
            {`${courseDocuments.length} document${courseDocuments.length !== 1 ? 's' : ''}`}
          </p>
        )}
        <div style={{ display: 'grid', gap: 'var(--ax-space-3)' }}>
          {courseDocuments.map((doc) => (
            <div key={doc.id} className="ax-card ax-card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--ax-space-3)', flexWrap: 'wrap' }}>
              <div>
                <Badge variant="primary" size="sm">{doc.doc_type || 'document'}</Badge>
                <h3 style={{ fontSize: 'var(--ax-text-base)', fontWeight: 'var(--ax-font-semibold)', margin: 'var(--ax-space-2) 0 var(--ax-space-1)' }}>{doc.title}</h3>
                <p style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-tertiary)', margin: 0 }}>
                  {doc.original_name || ''} {doc.file_size ? `• ${(Number(doc.file_size) / 1048576).toFixed(1)} Mo` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
                <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}`} className="ax-btn ax-btn--ghost ax-btn--sm">Fiche</Link>
                <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}/preview`} className="ax-btn ax-btn--secondary ax-btn--sm">Apercu</Link>
                <DownloadButton documentId={doc.id} document={doc} size="sm" />
                <FavoriteButton documentId={doc.id} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title="Explorer"
        subtitle={`Parcourez les ${visibleCount} cours — chaque cours affiche ses documents (0 à N)`}
        actions={
          <Link to={`${ROUTE_PATHS.DOCUMENTS}/create`}>
            <Button variant="primary" size="md">+ Nouveau document</Button>
          </Link>
        }
      />

      <DocumentSearchBar
        value={search}
        onChange={setSearch}
        onSubmit={handleSubmitSearch}
        placeholder="Rechercher un cours (code, nom)..."
      />

      <DocumentFilters
        faculties={references.faculties}
        departments={filters.facultyId
          ? references.departments.filter((d) => resolveDepartmentFacultyId(d) === String(filters.facultyId))
          : references.departments}
        allDepartments={references.departments}
        allLevels={references.levels}
        levels={availableLevels}
        semesters={availableSemesters}
        courses={courseOptions}
        tags={references.tags}
        filters={filters}
        onChange={(patch) => {
          if (patch.reset) {
            setFilters(emptyFilters())
            return
          }
          if (patch.facultyId !== undefined && patch.facultyId !== filters.facultyId) {
            // Cascade : changer de faculte reinitialise departement/niveau/semestre.
            setFilters((prev) => ({ ...prev, facultyId: patch.facultyId, departmentId: '', levelId: '', semesterId: '', courseId: '' }))
            return
          }
          if (patch.departmentId !== undefined && patch.departmentId !== filters.departmentId) {
            setFilters((prev) => ({ ...prev, departmentId: patch.departmentId, levelId: '', semesterId: '', courseId: '' }))
            return
          }
          setFilters((prev) => ({ ...prev, ...patch }))
        }}
      />

      {breadcrumb.length > 1 && (
        <nav className="ax-breadcrumb" aria-label="Fil d'Ariane" style={{ margin: 'var(--ax-space-2) 0' }}>
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1
            return (
              <span key={`${crumb.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--ax-space-1)' }}>
                {index > 0 && <span aria-hidden="true" style={{ color: 'var(--ax-text-tertiary)' }}>›</span>}
                {isLast ? (
                  <span aria-current="page" style={{ fontWeight: 'var(--ax-font-semibold)' }}>{crumb.label}</span>
                ) : (
                  <button
                    type="button"
                    className="ax-icon-btn ax-icon-btn--sm"
                    onClick={() => goUpTo(crumb.clear)}
                    style={{ minHeight: '44px' }}
                  >
                    {crumb.label}
                  </button>
                )}
              </span>
            )
          })}
        </nav>
      )}

      {isLoading && (
        <div style={{ padding: 'var(--ax-space-8) 0' }}>
          <p style={{ color: 'var(--ax-text-secondary)' }}>Chargement des cours...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadNonce((n) => n + 1)}>Réessayer</Button>
        </div>
      )}

      {!isLoading && !error && courses.length === 0 && !docFiltersActive && (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">Aucun cours trouvé</p>
          <p className="ax-empty-state__desc">Aucun cours ne correspond à votre recherche ou à votre classe pour l'instant. Ajustez vos critères pour élargir.</p>
          {(filters.facultyId || filters.departmentId || filters.levelId || filters.semesterId || filters.courseId) && (
            <Button variant="outline" size="sm" onClick={() => setFilters(emptyFilters())}>
              Voir tous les cours
            </Button>
          )}
        </div>
      )}

      {docFiltersActive && (
        <div style={{ marginTop: 'var(--ax-space-4)' }}>
          <p className="ax-doc-toolbar__count" aria-live="polite" style={{ fontWeight: 'var(--ax-font-semibold)' }}>
            {`${docResults.length} document${docResults.length !== 1 ? 's' : ''} correspond${docResults.length !== 1 ? 'ent' : ''} aux filtres`}
          </p>
          {isDocLoading && <p style={{ color: 'var(--ax-text-secondary)' }}>Chargement des documents...</p>}
          {!isDocLoading && docResults.length === 0 && (
            <div className="ax-empty-state">
              <p className="ax-empty-state__title">Aucun document trouvé</p>
              <p className="ax-empty-state__desc">Assouplissez les filtres de type, visibilité, dates ou compteurs.</p>
            </div>
          )}
          {!isDocLoading && docResults.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--ax-space-3)' }}>
              {docResults.map((doc) => (
                <div key={doc.id} className="ax-card ax-card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--ax-space-3)', flexWrap: 'wrap' }}>
                  <div>
                    <Badge variant="primary" size="sm">{doc.doc_type || 'document'}</Badge>
                    <h3 style={{ fontSize: 'var(--ax-text-base)', fontWeight: 'var(--ax-font-semibold)', margin: 'var(--ax-space-2) 0 var(--ax-space-1)' }}>{doc.title}</h3>
                    <p style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-tertiary)', margin: 0 }}>
                      {doc.original_name || ''} {doc.file_size ? `• ${(Number(doc.file_size) / 1048576).toFixed(1)} Mo` : ''}
                      {` • ${doc.views_count ?? 0} vues • ${doc.downloads_count ?? 0} téléchargements`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
                    <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}`} className="ax-btn ax-btn--ghost ax-btn--sm">Fiche</Link>
                    <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}/preview`} className="ax-btn ax-btn--secondary ax-btn--sm">Apercu</Link>
                    <DownloadButton documentId={doc.id} document={doc} size="sm" />
                    <FavoriteButton documentId={doc.id} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!docFiltersActive && !isLoading && !error && courses.length > 0 && (
        <div className="ax-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--ax-space-4)' }}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              levels={references.levels}
              semesters={references.semesters}
              isAdmin={isAdmin}
              actionsStyle={{ marginTop: 'var(--ax-space-3)' }}
            />
          ))}
        </div>
      )}
    </Container>
  )
}
