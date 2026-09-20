/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Upload Center Page
 * ---------------------------------------------------------------------------
 * Centre de televersement : zone de depot, file d'attente en temps reel,
 * resolution de doublons, barre d'outils globale.
 */

import { useState, useEffect, useCallback } from 'react'
import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { normalizeApiList } from '../../utils/academic'
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
    resolveDuplicate,
    purgeItems,
    markClassified,
    onEvent,
  } = useUploadQueue()

  const notify = useNotification()
  const [drives, setDrives] = useState([])
  const [selectedDriveId, setSelectedDriveId] = useState(null)
  // Fallback guidé : document téléversé mais cours non identifié.
  const [classifyTarget, setClassifyTarget] = useState(null)

  useEffect(() => onEvent((event) => {
    // A la fin de chaque téléversement, si l'auto-identification a échoué
    // (pas de cours ou type générique), on propose la sélection hiérarchique
    // au lieu d'une erreur — jamais de blocage pour l'étudiant.
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

  const handleClassifyConfirm = useCallback(async ({ courseId, docType }) => {
    if (!classifyTarget) return
    await DocumentApi.classify(classifyTarget.documentId, { course_id: courseId, doc_type: docType })
    markClassified(classifyTarget.itemId, { courseId, docType })
    notify.success('Document rattaché à votre cours. Il part en validation.')
    setClassifyTarget(null)
  }, [classifyTarget, markClassified, notify])

  const handleClassifyClose = useCallback(() => {
    // « Plus tard » : le document reste en attente, reclassifiable depuis
    // la file (« Préciser le cours ») — aucune erreur renvoyée à l'étudiant.
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
        if (!cancelled) setDrives(normalizeApiList(response))
      })
      .catch(() => {
        if (!cancelled) setDrives([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const defaultDrive = drives.find((d) => d.is_default) || drives[0] || null
  const effectiveDriveId = selectedDriveId ?? defaultDrive?.id ?? null

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList ?? [])
      if (files.length === 0) return
      enqueueFiles(files, { driveId: effectiveDriveId })
      notify.success(
        `${files.length} fichier${files.length > 1 ? 's' : ''} ajoute${files.length > 1 ? 's' : ''} a la file.`,
      )
    },
    [enqueueFiles, effectiveDriveId, notify],
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

  return (
    <Container>
      <PageHeader
        title="Centre de televersement"
        subtitle="Deposez vos documents pour les envoyer vers Google Drive"
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

      {drives.length > 0 && (
        <div className="ax-drive-selector" style={{ marginBottom: 'var(--ax-space-4)' }}>
          <label className="ax-drive-selector__label" htmlFor="upload-center-drive">
            Drive cible
          </label>
          <select
            id="upload-center-drive"
            className="ax-drive-selector__select"
            value={effectiveDriveId ?? ''}
            onChange={(event) =>
              setSelectedDriveId(event.target.value ? Number(event.target.value) : null)
            }
          >
            {drives.map((drive) => (
              <option key={drive.id} value={drive.id}>
                {drive.name} - priorite {drive.priority}
                {drive.is_default ? ' (defaut)' : ''}
              </option>
            ))}
          </select>
          <p className="ax-drive-selector__hint">
            Les envois sont rediriges automatiquement si le drive selectionne est sature.
          </p>
        </div>
      )}

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
          onResolveDuplicate={resolveDuplicate}
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
