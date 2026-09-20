/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Automation Platform Dashboard
 * ---------------------------------------------------------------------------
 * Orchestrates document processing, drive monitoring, indexes,
 * notifications, statistics and maintenance — frontend only.
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AutomationStatusCard from '../../components/automation/AutomationStatusCard'
import DriveHealthIndicator from '../../components/automation/DriveHealthIndicator'
import MaintenanceReportCard from '../../components/automation/MaintenanceReportCard'
import ConfirmMetadataDialog from '../../components/automation/ConfirmMetadataDialog'
import AdminSection from '../../components/admin/AdminSection'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { ROUTE_PATHS } from '../../constants/routes'
import { useAutomation } from '../../hooks/useAutomation'
import { FacultyApi } from '../../api/FacultyApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { CourseApi } from '../../api/CourseApi'
import { SemesterApi } from '../../api/SemesterApi'
import { UserApi } from '../../api/UserApi'
import { DocumentApi } from '../../api/DocumentApi'
import { normalizeApiList } from '../../utils/academic'
import { cachedAcademicList } from '../../utils/academicCache'
import { processDocumentFile } from '../../features/automation/documentAutomation'
import { syncWithRetry } from '../../features/automation/driveAutomation'
import { maybeRecalculateStatistics, prefetchSearches } from '../../features/automation/indexAutomation'
import { dailyUploads, docsByFaculty, docsByDepartment, missingDocuments } from '../../utils/automation'
import { useNotification } from '../../hooks/useNotification'

export default function AutomationDashboardPage() {
  const notify = useNotification()
  const { healthSnapshot, bestDrive, rebalanceList, maintenance, refreshDrives, refreshMaintenance } = useAutomation({ enabled: true })

  const [ctx, setCtx] = useState({ faculties: [], departments: [], courses: [], semesters: [], users: [], documents: [] })
  const [loadingCtx, setLoadingCtx] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stats, setStats] = useState({ daily: [], byFaculty: [], byDept: [], missing: [] })

  // Load context for suggestions — cours agrégés par département (source réelle)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [facs, deps, sems, users, docs] = await Promise.all([
          FacultyApi.list().catch(() => []),
          DepartmentApi.list().catch(() => []),
          SemesterApi.list().catch(() => []),
          UserApi.list().catch(() => ({ data: [] })),
          DocumentApi.list({ per_page: 100 }).catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        const departmentsList = normalizeApiList(deps)
        // Index unique + cache (plus de fan-out N×departements).
        const courses = await cachedAcademicList('courses', () => CourseApi.list()).catch(() => [])
        if (cancelled) return
        setCtx({
          faculties: normalizeApiList(facs),
          departments: departmentsList,
          courses,
          semesters: normalizeApiList(sems),
          users: normalizeApiList(users),
          documents: normalizeApiList(docs),
        })
      } finally {
        if (!cancelled) setLoadingCtx(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Statistics engine (derived, auto)
  useEffect(() => {
    if (ctx.documents.length === 0) return
    setStats({
      daily: dailyUploads(ctx.documents, 7),
      byFaculty: docsByFaculty(ctx.documents).slice(0, 5),
      byDept: docsByDepartment(ctx.documents).slice(0, 5),
      missing: missingDocuments(ctx.courses, ctx.documents),
    })
  }, [ctx.documents, ctx.courses])

  const [isProcessingFile, setIsProcessingFile] = useState(false)

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsProcessingFile(true)
    try {
      const result = await processDocumentFile(file, ctx)
      setProcessing({ ...result, fileName: file.name, fileSize: file.size })
      if (result.needsConfirmation) setDialogOpen(true)
      else notify.success(`Métadonnées extraites avec confiance ${Math.round(result.confidence * 100)}% — vous pouvez les corriger ci-dessous.`)
    } finally {
      setIsProcessingFile(false)
      // reset input pour permettre de redéposer le même fichier
      e.target.value = ''
    }
  }, [ctx, notify])

  const handleConfirm = useCallback((suggestions) => {
    setProcessing((prev) => prev ? { ...prev, suggestions, confidence: 1, needsConfirmation: false, corrected: true } : prev)
    setDialogOpen(false)
    notify.success(`Métadonnées confirmées : ${suggestions.docType} — ${suggestions.course?.name || suggestions.course?.code || 'sans cours'}`)
  }, [notify])

  const handleClearProcessing = useCallback(() => {
    setProcessing(null)
    setDialogOpen(false)
  }, [])

  const handleSyncBest = useCallback(async () => {
    if (!bestDrive) return
    const r = await syncWithRetry(bestDrive.id)
    if (r.ok) notify.success(`Drive ${bestDrive.name} synchronisé (${r.attempts} tentative(s)).`)
    else notify.error(`Échec sync ${bestDrive.name} après ${r.attempts} tentatives.`)
    refreshDrives()
  }, [bestDrive, notify, refreshDrives])

  const handleReindex = useCallback(async () => {
    const a = await maybeRecalculateStatistics()
    const b = await prefetchSearches()
    notify.info(a || b ? 'Index rafraîchi.' : 'Cache déjà à jour.')
  }, [notify])



  const daily = useMemo(() => stats.daily, [stats.daily])

  if (loadingCtx) return <LoadingScreen label="Initialisation de la plateforme d’automatisation…" />

  return (
    <div className="ax-container ax-automation-dashboard">
      <PageHeader
        title="Plateforme d’automatisation"
        subtitle="L’administrateur dépose et configure — la plateforme fait le reste."
        actions={<Badge variant="success" size="md">Automation active</Badge>}
      />

      {/* Document Processing */}
      <AdminSection title="Traitement des documents" description="Hash, doublons, métadonnées, suggestions, validation — vérifiez puis corrigez si besoin">
        <div className="ax-automation-doc">
          <label className="ax-field">
            <span className="ax-field__label">Déposer un fichier pour analyser ses métadonnées</span>
            <input className="ax-input" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png" onChange={handleFile} aria-label="Fichier à analyser" disabled={isProcessingFile} />
          </label>
          {isProcessingFile && <p className="ax-text--muted">Analyse en cours…</p>}
          {processing && (
            <div className="ax-automation-result">
              <p className="ax-text--sm">Fichier : <span className="ax-text--mono">{processing.meta.raw}</span> — Tokens: {processing.meta.tokens.join(', ') || '—'}</p>
              <p className="ax-text--sm">Confiance globale : <Badge variant={processing.confidence >= 0.65 ? 'success' : 'warning'} size="sm">{Math.round(processing.confidence * 100)}%</Badge> — Hash: <span className="ax-text--mono">{processing.hash ? `${processing.hash.slice(0, 12)}…` : '—'}</span>
                {processing.corrected && <Badge variant="success" size="sm">Corrigé</Badge>}
              </p>
              {processing.duplicate && <p className="ax-text--sm ax-text--danger">Doublon détecté : {processing.duplicate.title || processing.duplicate.id}</p>}
              {!processing.validation.valid && <p className="ax-text--sm ax-text--danger">{processing.validation.errors.join(' ')}</p>}
              <dl className="ax-definition-list ax-definition-list--compact">
                <dt>Faculté</dt><dd>{processing.suggestions.faculty?.name || '—'}</dd>
                <dt>Département</dt><dd>{processing.suggestions.department?.name || '—'}</dd>
                <dt>Cours</dt><dd>{processing.suggestions.course?.name || processing.suggestions.course?.code || '—'}</dd>
                <dt>Semestre</dt><dd>{processing.suggestions.semester?.name || '—'}</dd>
                <dt>Type</dt><dd>{processing.suggestions.docType}</dd>
              </dl>
              <div className="ax-automation-actions">
                <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>Vérifier / Corriger les métadonnées</Button>
                {processing.suggestions.course?.id && (
                  <Link
                    to={`${ROUTE_PATHS.DOCUMENTS}/create?course_id=${processing.suggestions.course.id}`}
                    className="ax-btn ax-btn--secondary ax-btn--sm"
                  >
                    Continuer vers téléversement
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearProcessing}>Effacer</Button>
              </div>
            </div>
          )}
        </div>
        <ConfirmMetadataDialog
          open={dialogOpen}
          meta={processing?.meta}
          suggestions={processing?.suggestions}
          confidence={processing?.confidence || 0}
          onConfirm={handleConfirm}
          onCancel={() => setDialogOpen(false)}
          faculties={ctx.faculties}
          departments={ctx.departments}
          courses={ctx.courses}
          semesters={ctx.semesters}
        />
      </AdminSection>

      {/* Drive Automation */}
      <AdminSection title="Automatisation Google Drive" description="Surveillance santé, sélection du meilleur drive, re-équilibrage, retry sync">
        <div className="ax-automation-grid">
          <AutomationStatusCard title="Drive recommandé" status={bestDrive ? 'healthy' : 'warning'} detail={bestDrive ? `${bestDrive.name} (prio ${bestDrive.priority}, ${bestDrive.available_storage || 0} dispo)` : 'Aucun drive sain disponible'} actions={bestDrive && <Button variant="primary" size="sm" onClick={handleSyncBest}>Synchroniser le meilleur drive</Button>} />
          <AutomationStatusCard title="Re-équilibrage" status={rebalanceList.length ? 'warning' : 'healthy'} detail={rebalanceList.length ? `${rebalanceList.length} drive(s) >80% d’occupation` : 'Aucun déséquilibre détecté'} />
        </div>
        <DriveHealthIndicator snapshot={healthSnapshot} />
        <div className="ax-automation-actions">
          <Button variant="ghost" size="sm" onClick={() => refreshDrives()}>Actualiser santé</Button>
        </div>
      </AdminSection>

      {/* Index Automation — seul le recalcul backend est réel */}
      <AdminSection title="Index automatiques" description="Recalcul des statistiques côté backend — sans intervention manuelle">
        <div className="ax-automation-grid">
          <AutomationStatusCard title="Statistiques" status="healthy" detail="Recalcul auto toutes les 90s (cache TTL)" actions={<Button variant="ghost" size="sm" onClick={handleReindex}>Forcer reindex</Button>} />
        </div>
      </AdminSection>

      {/* Statistics Engine */}
      <AdminSection title="Moteur de statistiques" description="Daily uploads, downloads, recherches, manquants, facultés/départements actifs, stockage, croissance">
        <div className="ax-automation-bars" role="img" aria-label="Uploads quotidiens">
          {daily.map((p) => (
            <div key={p.date} className="ax-automation-bars__row">
              <span className="ax-automation-bars__label">{p.date.slice(5)}</span>
              <div className="ax-progress"><div className="ax-progress__fill" style={{ width: `${Math.min(100, p.count * 20)}%` }} /></div>
              <span className="ax-automation-bars__value">{p.count}</span>
            </div>
          ))}
        </div>
        <div className="ax-automation-grid">
          <div className="ax-card ax-card--padded"><h4 className="ax-automation-card__title">Par faculté</h4><ul className="ax-automation-list">{stats.byFaculty.map((f) => <li key={f.key}>{f.label} — {f.count}</li>)}</ul></div>
          <div className="ax-card ax-card--padded"><h4 className="ax-automation-card__title">Par département</h4><ul className="ax-automation-list">{stats.byDept.map((d) => <li key={d.key}>{d.label} — {d.count}</li>)}</ul></div>
        </div>
        <p className="ax-text--muted">{stats.missing.length} cours sans document récent (&gt;30j)</p>
      </AdminSection>

      {/* System Maintenance — lecture seule (aucune suppression auto) */}
      <AdminSection title="Maintenance système" description="Vérification d’intégrité et rapports — lecture seule">
        <MaintenanceReportCard report={maintenance} onRefresh={() => refreshMaintenance()} />
      </AdminSection>
    </div>
  )
}
