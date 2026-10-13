/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Explorateur intelligent (cascade qui ne mene jamais a vide)
 * ---------------------------------------------------------------------------
 * Parcours unique et simple : Faculte -> Departement -> Classe -> Cours
 * -> Documents. Chaque etape ne propose QUE des choix qui contiennent du
 * contenu (elagage backend), avec compteurs visibles :
 *   "Chimie — 56 cours • 105 documents".
 * Un cours sans document affiche un appel au partage, jamais une erreur.
 * Page PUBLIQUE (invites bienvenus), 1 seule requete au chargement.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExplorerApi } from '../../api/ExplorerApi'
import { DocumentApi } from '../../api/DocumentApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { normalizeApiList } from '../../utils/academic'
import { Container, Button, Badge } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'

function StepCard({ title, sub, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ax-card ax-explorer__card${active ? ' ax-explorer__card--active' : ''}`}
    >
      <span className="ax-explorer__card-title">{title}</span>
      {sub ? <span className="ax-explorer__card-sub">{sub}</span> : null}
    </button>
  )
}

export default function ExplorerPage() {
  const [tree, setTree] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [facultyId, setFacultyId] = useState(null)
  const [departmentId, setDepartmentId] = useState(null)
  const [levelKey, setLevelKey] = useState(null)
  const [courseId, setCourseId] = useState(null)

  const [documents, setDocuments] = useState([])
  const [isDocsLoading, setIsDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState(null)

  // Arbre complet en 1 requete.
  useEffect(() => {
    let cancelled = false
    async function run() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await ExplorerApi.tree()
        if (!cancelled) setTree(normalizeApiList(res))
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Impossible de charger les facultés.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const faculty = useMemo(
    () => tree.find((f) => String(f.id) === String(facultyId)) || null,
    [tree, facultyId],
  )
  const department = useMemo(
    () => (faculty?.children || []).find((d) => String(d.id) === String(departmentId)) || null,
    [faculty, departmentId],
  )
  const level = useMemo(
    () => (department?.levels || []).find((l) => String(l.id ?? 'gen') === String(levelKey)) || null,
    [department, levelKey],
  )
  const course = useMemo(
    () => (level?.courses || []).find((c) => String(c.id) === String(courseId)) || null,
    [level, courseId],
  )

  // Documents du cours selectionne.
  useEffect(() => {
    if (!course) {
      setDocuments([])
      return undefined
    }
    let cancelled = false
    async function run() {
      setIsDocsLoading(true)
      setDocsError(null)
      try {
        const res = await DocumentApi.list({ course_id: course.id, per_page: 100 })
        if (!cancelled) setDocuments(normalizeApiList(res))
      } catch (err) {
        if (!cancelled) setDocsError(err?.message || 'Impossible de charger les documents.')
      } finally {
        if (!cancelled) setIsDocsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [course])

  const pickFaculty = (id) => {
    setFacultyId(id)
    setDepartmentId(null)
    setLevelKey(null)
    setCourseId(null)
  }
  const pickDepartment = (id) => {
    setDepartmentId(id)
    setLevelKey(null)
    setCourseId(null)
  }
  const pickLevel = (key) => {
    setLevelKey(key)
    setCourseId(null)
  }
  const reset = () => {
    setFacultyId(null)
    setDepartmentId(null)
    setLevelKey(null)
    setCourseId(null)
  }

  // Fil d'Ariane : chaque etape reste cliquable (jamais bloque).
  const crumbs = [
    { label: 'Facultés', onClick: reset, active: facultyId === null },
    faculty && { label: faculty.name, onClick: () => pickFaculty(faculty.id), active: departmentId === null },
    department && { label: department.name, onClick: () => pickDepartment(department.id), active: levelKey === null },
    level && { label: level.code, onClick: () => pickLevel(levelKey), active: courseId === null },
    course && { label: course.code || course.title, onClick: null, active: true },
  ].filter(Boolean)

  return (
    <Container>
      <PageHeader
        title="Explorer"
        subtitle="Faculté → Département → Classe → Cours → Documents. Chaque choix mène à du contenu."
      />

      <nav className="ax-explorer__crumbs" aria-label="Fil d'Ariane">
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="ax-explorer__crumb">
            {i > 0 && <span className="ax-explorer__crumb-sep">›</span>}
            {c.onClick && !c.active ? (
              <button type="button" className="ax-explorer__crumb-link" onClick={c.onClick}>{c.label}</button>
            ) : (
              <strong>{c.label}</strong>
            )}
          </span>
        ))}
        {facultyId !== null && (
          <Button variant="ghost" size="sm" onClick={reset}>Tout recommencer</Button>
        )}
      </nav>

      {isLoading && <p className="ax-text-secondary">Chargement des facultés…</p>}
      {error && (
        <div className="ax-alert ax-alert--error">
          <p>{error}</p>
          <Button size="sm" onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      )}

      {!isLoading && !error && course && (
        <section aria-label="Documents du cours">
          <h2 className="ax-explorer__step-title">
            {course.code ? `${course.code} — ` : ''}{course.title}
            <Badge variant="primary" size="sm">{documents.length} document{documents.length > 1 ? 's' : ''}</Badge>
          </h2>
          {isDocsLoading && <p className="ax-text-secondary">Chargement des documents…</p>}
          {docsError && <p className="ax-alert ax-alert--error">{docsError}</p>}
          {!isDocsLoading && !docsError && documents.length === 0 && (
            <div className="ax-empty">
              <p><strong>Pas encore de documents pour ce cours.</strong></p>
              <p className="ax-text-secondary">Sois le premier à partager : ton document aidera toute la classe.</p>
              <Link to={ROUTE_PATHS.UPLOAD} className="ax-btn ax-btn--primary">Partager un document</Link>
            </div>
          )}
          <ul className="ax-explorer__docs">
            {documents.map((doc) => (
              <li key={doc.id} className="ax-card ax-explorer__doc">
                <span className="ax-explorer__doc-title">{doc.title}</span>
                <span className="ax-explorer__doc-actions">
                  <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}/preview`} className="ax-btn ax-btn--secondary ax-btn--sm">Aperçu</Link>
                  <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}`} className="ax-btn ax-btn--ghost ax-btn--sm">Détails</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isLoading && !error && !course && (
        <section aria-label="Étapes">
          {facultyId === null && (
            <>
              <h2 className="ax-explorer__step-title">1. Choisis ta faculté</h2>
              <div className="ax-explorer__grid">
                {tree.map((f) => (
                  <StepCard
                    key={f.id}
                    title={f.name}
                    sub={`${f.departments} département${f.departments > 1 ? 's' : ''} • ${f.documents} document${f.documents > 1 ? 's' : ''}`}
                    onClick={() => pickFaculty(f.id)}
                  />
                ))}
              </div>
            </>
          )}

          {faculty && departmentId === null && (
            <>
              <h2 className="ax-explorer__step-title">2. Choisis ton département</h2>
              <div className="ax-explorer__grid">
                {(faculty.children || []).map((d) => (
                  <StepCard
                    key={d.id}
                    title={d.name}
                    sub={`${d.courses} cours • ${d.documents} document${d.documents > 1 ? 's' : ''}`}
                    onClick={() => pickDepartment(d.id)}
                  />
                ))}
              </div>
            </>
          )}

          {department && levelKey === null && (
            <>
              <h2 className="ax-explorer__step-title">3. Choisis ta classe</h2>
              <div className="ax-explorer__grid">
                {(department.levels || []).map((l) => (
                  <StepCard
                    key={l.id ?? 'gen'}
                    title={`${l.code} — ${l.name}`}
                    sub={`${l.courses.length} cours • ${l.documents} document${l.documents > 1 ? 's' : ''}`}
                    onClick={() => pickLevel(String(l.id ?? 'gen'))}
                  />
                ))}
              </div>
            </>
          )}

          {level && (
            <>
              <h2 className="ax-explorer__step-title">4. Choisis ton cours</h2>
              <div className="ax-explorer__grid">
                {(level.courses || []).map((c) => (
                  <StepCard
                    key={c.id}
                    title={`${c.code ? `${c.code} — ` : ''}${c.title}`}
                    sub={c.documents > 0 ? `${c.documents} document${c.documents > 1 ? 's' : ''}` : 'Aucun document — partage le premier !'}
                    onClick={() => setCourseId(c.id)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </Container>
  )
}
