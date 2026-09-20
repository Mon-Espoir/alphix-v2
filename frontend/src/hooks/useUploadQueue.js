/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Hook de file d'attente d'upload
 * ---------------------------------------------------------------------------
 * Pont React 19 (`useSyncExternalStore`) au-dessus du moteur d'upload.
 * Expose un instantane immutable + les actions stabilisees du moteur.
 * Desabonnement automatique au demontage (aucune fuite).
 */

import { useCallback, useSyncExternalStore } from 'react'
import { uploadEngine } from '../features/upload/uploadEngine'

/**
 * Acces reactif a la file d'attente d'upload.
 *
 * @returns {{
 *   queue: object,
 *   enqueueFiles: (files: FileList|File[], opts?: object) => string[],
 *   cancelItem: (id: string) => void,
 *   retryItem: (id: string) => void,
 *   removeItem: (id: string) => void,
 *   clearCompleted: (ids?: string[]) => number,
 *   purgeItems: (ids: string[]) => number,
 *   markClassified: (id: string, classification?: object) => void,
 *   resolveDuplicate: (id: string, decision: 'replace'|'keep_both'|'cancel') => Promise<void>,
 *   pause: () => void,
 *   resume: () => void,
 *   onEvent: (handler: (event: object) => void) => () => void,
 * }} Instantane + actions.
 */
export function useUploadQueue() {
  const queue = useSyncExternalStore(uploadEngine.subscribe, uploadEngine.getSnapshot)

  const resolveDuplicate = useCallback(
    (id, decision) => uploadEngine.resolveDuplicate(id, decision),
    [],
  )

  const onEvent = useCallback((handler) => uploadEngine.onEvent(handler), [])

  return {
    queue,
    enqueueFiles: uploadEngine.enqueueFiles,
    cancelItem: uploadEngine.cancelItem,
    retryItem: uploadEngine.retryItem,
    removeItem: uploadEngine.removeItem,
    clearCompleted: uploadEngine.clearCompleted,
    purgeItems: uploadEngine.purgeItems,
    markClassified: uploadEngine.markClassified,
    resolveDuplicate,
    pause: uploadEngine.pause,
    resume: uploadEngine.resume,
    onEvent,
  }
}

export default useUploadQueue
