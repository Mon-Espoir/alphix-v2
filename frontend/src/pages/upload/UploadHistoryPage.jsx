/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Upload History Page
 * ---------------------------------------------------------------------------
 * Historique complet des televersements : filtres par statut, retry des
 * echecs, suppression unitaire et par lot.
 */

import { useCallback } from 'react'
import { Container, Button } from '../../components/ui'
import PageHeader from '../../components/common/PageHeader'
import UploadHistory from '../../components/upload/UploadHistory'
import { useUploadQueue } from '../../hooks/useUploadQueue'
import { useNotification } from '../../hooks/useNotification'

/**
 * Page d'historique des televersements.
 * @returns {import('react').JSX.Element}
 */
export default function UploadHistoryPage() {
  const { queue, retryItem, removeItem, purgeItems } = useUploadQueue()
  const notify = useNotification()

  const handleBatchDelete = useCallback(
    (ids) => {
      const removed = purgeItems(ids)
      notify.success(`${removed} element${removed > 1 ? 's' : ''} supprime${removed > 1 ? 's' : ''}.`)
      return removed
    },
    [purgeItems, notify],
  )

  const handlePurgeFailed = useCallback(() => {
    const failedIds = queue.items
      .filter((item) => item.status === 'failed')
      .map((item) => item.id)
    if (failedIds.length === 0) return
    handleBatchDelete(failedIds)
  }, [queue.items, handleBatchDelete])

  return (
    <Container>
      <PageHeader
        title="Historique des televersements"
        subtitle="Consultez et gerez l'ensemble des operations d'envoi"
        actions={
          <Button variant="secondary" size="sm" onClick={handlePurgeFailed}>
            Purger les echecs
          </Button>
        }
      />

      <UploadHistory
        items={queue.items}
        onRetry={retryItem}
        onRemove={removeItem}
        onBatchDelete={handleBatchDelete}
      />
    </Container>
  )
}
