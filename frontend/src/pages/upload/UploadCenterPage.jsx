/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Upload Center Page
 * ---------------------------------------------------------------------------
 * Televersement simplifie : l'etudiant choisit SON COURS et le TYPE de
 * document, depose son fichier, et l'envoi part immediatement
 * (statut approved = visible par tous des la validation).
 * Aucun blocage doublon : deux etudiants peuvent envoyer le meme fichier.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { CourseApi } from '../../api/CourseApi'
import { cachedAcademicList } from '../../utils/academicCache'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import {
  UploadZone,
  UploadQueue,
  UploadToolbar,
} from '../../components/upload'
import UploadModal from '../../components/documents/UploadModal'
import { DocumentApi } from '../../api/DocumentApi'
import { useUploadQueue } from '../../hooks/useUploadQueue'
import { useNotification } from '../../hooks/useNotification'
import { UPLOAD_CLASSIFY_TYPES } from '../../constants/upload'

/**
 * Page principale de televersement.
 * @returns {import('react').JSX.Element}
 */
export default function UploadCenterPage() {
  const {
    queue,
    enqueueFiles,
    cancelItem,
    retryItem,
    removeItem,
    clearCompleted,
    pause,
    resume,
    purgeItems,
    markClassified,
    onEvent,
  } = useUploadQueue()

  const notify = useNotification()
  const [drives, setDrives] = useState([])
  // Fallback guidé : document téléversé mais cours non identifié.
  const [classifyTarget, setClassifyTarget] = useState(null)
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [docType, setDocType] = useState('')

  useEffect(() => onEvent((event) => {
    // Filet de sécurité : si malgre tout un document arrive sans cours
    // identifié, on propose la selection hierarchique — jamais de blocage.
    if (event?.type === 'completed' && event?.item?.needsClassification && event?.item?.documentId) {
      setClassifyTarget({
        itemId: event.itemId,
        documentId: event.item.documentId,
        fileName: event.item.name,
        courseId: event.item.courseId,
        docType: event.item.docType,
      })
    }
  }), [onEvent])

  const handleClassifyConfirm = useCallback(async ({ courseId: cid, docType: dtype }) => {
    if (!classifyTarget) return
    await DocumentApi.classify(classifyTarget.documentId, { course_id: cid, doc_type: dtype })
    markClassified(classifyTarget.itemId, { courseId: cid, docType: dtype })
    notify.success('Document rattache a votre cours.')
    setClassifyTarget(null)
  }, [classifyTarget, markClassified, notify])

  const handleClassifyClose = useCallback(() => {
    setClassifyTarget(null)
  }, [])

  const handleClassifyReopen = useCallback((item) => {
    if (!item?.documentId) return
    setClassifyTarget({
      itemId: item.id,
      documentId: item.documentId,
      fileName: item.name,
      courseId: item.courseId,
      docType: item.docType,
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    GoogleDriveApi.getActiveByPriority()
      .then((response) => {
        if (!cancelled) {
          const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
          setDrives(list)
        }
      })
      .catch(() => {
        if (!cancelled) setDrives([])
      })
    cachedAcademicList('courses', () => CourseApi.list())
      .then((list) => {
        if (!cancelled) setCourses(list)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const defaultDrive = drives.find((d) => d.is_default) || drives[0] || null
  const effectiveDriveId = defaultDrive?.id ?? null

  const courseOptions = useMemo(
    () =>
      courses
        .map((course) => ({
          value: String(course.id),
          label: `${course.code ? `${course.code} — ` : ''}${course.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [courses],
  )

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList ?? [])
      if (files.length === 0) return
      // Formulaire simplifie : cours ET type choisis avant l'envoi.
      if (!courseId || !docType) {
        notify.warning('Choisissez d\u2019abord votre cours et le type de document.')
        return
      }
      enqueueFiles(files, {
        driveId: effectiveDriveId,
        courseId: Number(courseId),
        docType,
      })
      notify.success(
        `${files.length} fichier${files.length > 1 ? 's' : ''} ajoute${files.length > 1 ? 's' : ''} \u00e0 la file.`,
      )
    },
    [enqueueFiles, effectiveDriveId, courseId, docType, notify],
  )

  const handlePurgeFailed = useCallback(() => {
    const failedIds = queue.items
      .filter((item) => item.status === 'failed')
      .map((item) => item.id)
    if (failedIds.length === 0) return
    purgeItems(failedIds)
  }, [queue.items, purgeItems])

  const isPaused = queue.isPaused
  const counts = queue.counts
  const formReady = Boolean(courseId && docType)

  return (
    <Container>
      <PageHeader
        title="Centre de televersement"
        subtitle="Choisissez votre cours, le type de document, puis deposez le fichier"
        actions={
          <Button
            variant={isPaused ? 'primary' : 'secondary'}
            size="sm"
            onClick={isPaused ? resume : pause}
            disabled={counts.total === 0}
          >
            {isPaused ? 'Reprendre la file' : 'Mettre en pause'}
          </Button>
        }
      />

      {/* Formulaire simplifie : cours + type, obligatoires avant envoi */}
      <div className="ax-upload-form" style={{ marginBottom: 'var(--ax-space-4)' }}>
        <div className="ax-form-group">
          <label className="ax-form-group__label" htmlFor="upload-center-course">
            Votre cours *
          </label>
          <select
            id="upload-center-course"
            className="ax-form-group__input"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">— Choisir votre cours —</option>
            {courseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ax-form-group">
          <label className="ax-form-group__label" htmlFor="upload-center-doctype">
            Type de document *
          </label>
          <select
            id="upload-center-doctype"
            className="ax-form-group__input"
            value={docType}
            onChange={(event) => setDocType(event.target.value)}
          >
            <option value="">— Choisir le type —</option>
            {UPLOAD_CLASSIFY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>
        {!formReady && (
          <p className="ax-text--muted ax-text--sm" style={{ margin: 0 }}>
            Selectionnez votre cours et le type, puis deposez votre fichier.
            Le document est publie immediatement apres l&apos;envoi.
          </p>
        )}
      </div>

      <UploadZone onFiles={handleFiles} disabled={isPaused} multiple />

      <div style={{ marginTop: 'var(--ax-space-4)' }}>
        <UploadToolbar
          counts={counts}
          isPaused={isPaused}
          onPause={pause}
          onResume={resume}
          onClearCompleted={clearCompleted}
          onPurgeFailed={handlePurgeFailed}
        />
      </div>

      <div style={{ marginTop: 'var(--ax-space-4)' }}>
        <UploadQueue
          items={queue.items}
          activeId={queue.activeId}
          onCancel={cancelItem}
          onRetry={retryItem}
          onRemove={removeItem}
          onClassify={handleClassifyReopen}
        />
      </div>

      <UploadModal
        open={classifyTarget !== null}
        target={classifyTarget}
        onClose={handleClassifyClose}
        onConfirm={handleClassifyConfirm}
      />
    </Container>
  )
}
