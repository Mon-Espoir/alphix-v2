/**
 * ALPHIX V2 — Tests du moteur d'upload : transitions d'etat de la file,
 * detection/resolution de doublons, retries, annulation et purges.
 * Les couches API sont simulees ; seul le comportement du moteur est teste.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { UploadEngine } from './uploadEngine'
import { UploadApi } from '../../api/UploadApi'
import { DocumentApi } from '../../api/DocumentApi'
import { ApiError } from '../../utils/apiError'
import { UPLOAD_ITEM_STATUS } from '../../constants/upload'
import { API_ERROR_TYPES } from '../../constants/api'

vi.mock('../../api/UploadApi', () => ({
  UploadApi: {
    validateFile: vi.fn(),
    findDuplicateByHash: vi.fn(),
    computeHash: vi.fn(),
    detectMimeType: vi.fn(),
  },
}))

vi.mock('../../api/DocumentApi', () => ({
  DocumentApi: {
    create: vi.fn(),
    patch: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
}))

/**
 * Fichier factice conforme au contrat File (Blob reel pour le hachage).
 * Le contenu depend du nom : deux fichiers differents n'ont JAMAIS la meme
 * empreinte (isole les tests de doublon des parcours nominaux).
 */
function makeFile(name = 'cours-algo.pdf', size = 1024, type = 'application/pdf') {
  const length = Math.max(1, Math.min(size, 64 * 1024))
  const content = new Uint8Array(length)
  for (let i = 0; i < length; i += 1) {
    content[i] = (name.charCodeAt(i % name.length) + i) % 256
  }
  return new File([content], name, { type })
}

/** Erreur reseau normalisee (retentable). */
const networkError = () =>
  new ApiError({ type: API_ERROR_TYPES.NETWORK, message: 'Reseau indisponible.' })

/** Reponse serveur 404 standard (aucun doublon). */
const noDuplicate = () =>
  new ApiError({ type: 'client', status: 404, message: 'No duplicate document found' })

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  UploadApi.findDuplicateByHash.mockRejectedValue(noDuplicate())
  UploadApi.validateFile.mockResolvedValue({ valid: true, errors: [] })
  DocumentApi.create.mockResolvedValue({ id: 42 })
})

afterEach(() => {
  vi.useRealTimers()
})

/** Avance le temps factice en vidant les microtaches (pipeline asynchrone). */
async function settle(ms = 1, rounds = 40) {
  for (let round = 0; round < rounds; round += 1) {
    await vi.advanceTimersByTimeAsync(ms)
  }
}

/**
 * Attend DETERMINISTEMENT qu'une condition sur l'instantane devienne vraie,
 * en avancant le temps factice par petits pas. Elimine toute course liee a un
 * budget de cycles fixe.
 * @param {() => boolean} predicate - Condition a satisfaire.
 * @param {{ms?: number, rounds?: number}} [opts] - Pas et budget max.
 * @returns {Promise<boolean>} true si la condition a ete satisfaite.
 */
async function waitFor(predicate, opts = {}) {
  const ms = opts.ms ?? 10
  const rounds = opts.rounds ?? 600
  if (predicate()) return true
  for (let round = 0; round < rounds; round += 1) {
    await vi.advanceTimersByTimeAsync(ms)
    if (predicate()) return true
  }
  return false
}

describe('transitions d’etat de la file', () => {
  it('suit le cycle complet pending -> hashing -> checking -> uploading -> uploaded', async () => {
    const engine = new UploadEngine()
    const seenStatuses = []
    const unsubscribe = engine.subscribe((snapshot) => {
      const active = snapshot.items[0]
      if (active && seenStatuses.at(-1) !== active.status) seenStatuses.push(active.status)
    })

    const [id] = engine.enqueueFiles([makeFile()])
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.PENDING)

    const reached = await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.UPLOADED,
    )
    expect(reached).toBe(true)

    const snapshot = engine.getSnapshot()
    expect(snapshot.items[0].status).toBe(UPLOAD_ITEM_STATUS.UPLOADED)
    expect(snapshot.items[0].progress).toBe(100)
    expect(snapshot.items[0].hash).toHaveLength(64)
    expect(snapshot.items[0].documentId).toBe(42)
    expect(snapshot.counts.uploaded).toBe(1)
    expect(snapshot.stats.totalBytesUploaded).toBe(1024)
    expect(seenStatuses).toEqual([
      UPLOAD_ITEM_STATUS.PENDING,
      UPLOAD_ITEM_STATUS.HASHING,
      UPLOAD_ITEM_STATUS.CHECKING,
      UPLOAD_ITEM_STATUS.UPLOADING,
      UPLOAD_ITEM_STATUS.UPLOADED,
    ])
    expect(typeof id).toBe('string')
    unsubscribe()
    engine.destroy()
  })

  it('traite la file strictement en sequence (un actif a la fois)', async () => {
    const engine = new UploadEngine()
    let concurrentTransfers = 0
    let maxConcurrentTransfers = 0

    UploadApi.validateFile.mockImplementation(async () => {
      concurrentTransfers += 1
      maxConcurrentTransfers = Math.max(maxConcurrentTransfers, concurrentTransfers)
      await Promise.resolve()
      concurrentTransfers -= 1
      return { valid: true, errors: [] }
    })

    engine.enqueueFiles([makeFile('a.pdf'), makeFile('b.pdf')])

    const allUploaded = await waitFor(() => {
      const items = engine.getSnapshot().items
      return items.length === 2 && items.every((item) => item.status === UPLOAD_ITEM_STATUS.UPLOADED)
    })
    expect(allUploaded).toBe(true)

    expect(maxConcurrentTransfers).toBe(1)
    expect(engine.getSnapshot().counts.uploaded).toBe(2)
    engine.destroy()
  })

  it('bascule en FAILED immediat un fichier invalide sans toucher aux API', async () => {
    const engine = new UploadEngine()
    engine.enqueueFiles([new File([new Uint8Array(8)], 'malware.exe', { type: 'application/zip' })])
    await settle()

    const item = engine.getSnapshot().items[0]
    expect(item.status).toBe(UPLOAD_ITEM_STATUS.FAILED)
    expect(item.error.type).toBe(API_ERROR_TYPES.VALIDATION)
    expect(item.error.message).toMatch(/non autorise/i)
    expect(UploadApi.validateFile).not.toHaveBeenCalled()
    expect(DocumentApi.create).not.toHaveBeenCalled()
    engine.destroy()
  })

  it('emet un evenement completed avec la vue figee de l’element', async () => {
    const engine = new UploadEngine()
    const handler = vi.fn()
    const off = engine.onEvent(handler)

    engine.enqueueFiles([makeFile()])
    await waitFor(() => handler.mock.calls.length > 0)

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completed', item: expect.objectContaining({ status: 'uploaded' }) }),
    )
    off()
    engine.destroy()
  })
})

describe('detection et resolution de doublons', () => {
  it('detecte le doublon serveur et passe en AWAITING_DECISION', async () => {
    const engine = new UploadEngine()
    UploadApi.findDuplicateByHash.mockResolvedValue({
      id: 7,
      title: 'Cours existant',
      original_name: 'cours-algo.pdf',
      file_size: 2048,
      version: '1.0',
      created_at: '2026-01-01T00:00:00Z',
    })

    engine.enqueueFiles([makeFile()])
    const detected = await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.AWAITING_DECISION,
    )
    expect(detected).toBe(true)

    const item = engine.getSnapshot().items[0]
    expect(item.status).toBe(UPLOAD_ITEM_STATUS.AWAITING_DECISION)
    expect(item.duplicateOf).toMatchObject({ id: 7, title: 'Cours existant', origin: 'server' })
    expect(UploadApi.validateFile).not.toHaveBeenCalled()
    engine.destroy()
  })

  it("resolution 'replace' met a jour le document existant (version majeure)", async () => {
    const engine = new UploadEngine()
    UploadApi.findDuplicateByHash.mockResolvedValue({
      id: 7,
      title: 'Cours existant',
      version: '1.3',
      original_name: 'cours-algo.pdf',
      file_size: 2048,
    })
    DocumentApi.patch.mockResolvedValue({ id: 7 })

    const [id] = engine.enqueueFiles([makeFile()])
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.AWAITING_DECISION,
    )
    await engine.resolveDuplicate(id, 'replace')
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.UPLOADED,
    )

    expect(DocumentApi.patch).toHaveBeenCalledTimes(1)
    const [patchedId, payload] = DocumentApi.patch.mock.calls[0]
    expect(patchedId).toBe(7)
    expect(payload.version).toBe('2.0')
    expect(payload.metadata).toContain('resolution:replace')

    const item = engine.getSnapshot().items[0]
    expect(item.status).toBe(UPLOAD_ITEM_STATUS.UPLOADED)
    expect(item.resolution).toBe('replace')
    expect(item.documentId).toBe(7)
    engine.destroy()
  })

  it("resolution 'keep_both' enregistre une revision (increment mineur)", async () => {
    const engine = new UploadEngine()
    UploadApi.findDuplicateByHash.mockResolvedValue({
      id: 9,
      title: 'Rapport final',
      version: '2.4',
    })
    DocumentApi.patch.mockResolvedValue({ id: 9 })

    const [id] = engine.enqueueFiles([makeFile('rapport-final.pdf')])
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.AWAITING_DECISION,
    )
    await engine.resolveDuplicate(id, 'keep_both')
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.UPLOADED,
    )

    const [, payload] = DocumentApi.patch.mock.calls[0]
    expect(payload.version).toBe('2.5')
    expect(payload.metadata).toContain('resolution:revision')

    const item = engine.getSnapshot().items[0]
    expect(item.status).toBe(UPLOAD_ITEM_STATUS.UPLOADED)
    expect(item.resolution).toBe('keep_both')
    engine.destroy()
  })

  it("resolution 'cancel' abandonne l'entrant sans requete", async () => {
    const engine = new UploadEngine()
    UploadApi.findDuplicateByHash.mockResolvedValue({ id: 9, title: 'X', version: '1.0' })

    const [id] = engine.enqueueFiles([makeFile()])
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.AWAITING_DECISION,
    )
    await engine.resolveDuplicate(id, 'cancel')
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.CANCELLED,
    )

    expect(DocumentApi.patch).not.toHaveBeenCalled()
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.CANCELLED)
    engine.destroy()
  })

  it('ignore les decisions sur des elements non en attente (garde d’etat)', async () => {
    const engine = new UploadEngine()
    const [id] = engine.enqueueFiles([makeFile()])
    await settle()
    const patchesBefore = DocumentApi.patch.mock.calls.length

    await engine.resolveDuplicate(`${id}-inconnu`, 'replace')
    expect(DocumentApi.patch.mock.calls.length).toBe(patchesBefore)
    engine.destroy()
  })
})

describe('retry automatique sur erreurs reseau', () => {
  it('rejoue le transfert avec backoff puis complete', async () => {
    const engine = new UploadEngine()
    UploadApi.validateFile
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue({ valid: true, errors: [] })

    engine.enqueueFiles([makeFile()])

    // Tentative 1 -> echec -> backoff 1000 ms.
    const firstFailure = await waitFor(
      () => engine.getSnapshot().items[0]?.attempts === 1,
    )
    expect(firstFailure).toBe(true)

    // Tentative 2 -> echec -> backoff 2000 ms.
    await vi.advanceTimersByTimeAsync(1000)
    const secondFailure = await waitFor(
      () => engine.getSnapshot().items[0]?.attempts === 2,
    )
    expect(secondFailure).toBe(true)

    // Tentative 3 -> succes.
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.UPLOADED,
    )

    const item = engine.getSnapshot().items[0]
    expect(UploadApi.validateFile).toHaveBeenCalledTimes(3)
    expect(item.status).toBe(UPLOAD_ITEM_STATUS.UPLOADED)
    engine.destroy()
  })

  it('echoue definitivement apres epuisement des tentatives', async () => {
    const engine = new UploadEngine()
    UploadApi.validateFile.mockRejectedValue(networkError())

    engine.enqueueFiles([makeFile()])
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.FAILED,
    )

    const item = engine.getSnapshot().items[0]
    expect(UploadApi.validateFile).toHaveBeenCalledTimes(3)
    expect(item.status).toBe(UPLOAD_ITEM_STATUS.FAILED)
    expect(item.error.type).toBe(API_ERROR_TYPES.NETWORK)
    engine.destroy()
  })

  it('ne retente pas une erreur de validation (non retentable)', async () => {
    const engine = new UploadEngine()
    UploadApi.validateFile.mockRejectedValue(
      new ApiError({ type: API_ERROR_TYPES.VALIDATION, status: 422, message: 'MIME non autorise' }),
    )

    engine.enqueueFiles([makeFile()])
    await waitFor(
      () => UploadApi.validateFile.mock.calls.length > 0,
    )
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.FAILED,
    )

    expect(UploadApi.validateFile).toHaveBeenCalledTimes(1)
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.FAILED)
    engine.destroy()
  })

  it("retryItem repart un element echoue depuis zero", async () => {
    const engine = new UploadEngine()
    UploadApi.validateFile
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())

    const [id] = engine.enqueueFiles([makeFile()])
    const exhausted = await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.FAILED,
    )
    expect(exhausted).toBe(true)

    // Le retry reinitialise les compteurs ; l'appel suivant retombe sur
    // l'implementation par defaut (succes) posee dans beforeEach.
    engine.retryItem(id)
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.PENDING)
    expect(engine.getSnapshot().items[0].attempts).toBe(0)
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.UPLOADED,
    )

    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.UPLOADED)
    engine.destroy()
  })
})

describe('annulation', () => {
  it("annule un transfert actif via l'AbortController (statut CANCELLED)", async () => {
    const engine = new UploadEngine()
    let capturedSignal = null
    UploadApi.validateFile.mockImplementation((_data, config) => {
      capturedSignal = config?.signal ?? null
      return new Promise((_resolve, reject) => {
        if (!capturedSignal) return
        capturedSignal.addEventListener('abort', () => {
          reject({
            isAxiosError: true,
            code: 'ERR_CANCELED',
            config: { url: '/upload/validate-file', method: 'post' },
          })
        })
      })
    })

    const [id] = engine.enqueueFiles([makeFile()])
    const transferring = await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.UPLOADING,
    )
    expect(transferring).toBe(true)

    engine.cancelItem(id)
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.CANCELLED,
    )

    const item = engine.getSnapshot().items[0]
    expect(capturedSignal.aborted).toBe(true)
    expect(item.status).toBe(UPLOAD_ITEM_STATUS.CANCELLED)
    engine.destroy()
  })

  it('annule un element encore en attente avant demarrage', () => {
    const engine = new UploadEngine()
    engine.pause()
    const [id] = engine.enqueueFiles([makeFile()])

    engine.cancelItem(id)
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.CANCELLED)
    engine.resume()
    engine.destroy()
  })
})

describe('pause / reprise de la file', () => {
  it('bloque le demarrage en pause puis traite a la reprise', async () => {
    const engine = new UploadEngine()
    engine.pause()
    engine.enqueueFiles([makeFile()])

    await settle()
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.PENDING)
    expect(UploadApi.validateFile).not.toHaveBeenCalled()

    engine.resume()
    await waitFor(
      () => engine.getSnapshot().items[0]?.status === UPLOAD_ITEM_STATUS.UPLOADED,
    )
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.UPLOADED)
    engine.destroy()
  })
})

describe('purge et suppression par lot', () => {
  it('clearCompleted ne supprime que les envois reussis', async () => {
    const engine = new UploadEngine()
    engine.enqueueFiles([makeFile('ok.pdf')])
    engine.enqueueFiles([new File([new Uint8Array(4)], 'bad.exe', { type: 'application/zip' })])
    await waitFor(() => {
      const items = engine.getSnapshot().items
      const valid = items.find((item) => item.mimeType === 'application/pdf')
      return Boolean(valid && valid.status === UPLOAD_ITEM_STATUS.UPLOADED)
    })

    engine.clearCompleted()
    const items = engine.getSnapshot().items
    expect(items).toHaveLength(1)
    expect(items[0].status).toBe(UPLOAD_ITEM_STATUS.FAILED)
    engine.destroy()
  })

  it('purgeItems supprime un lot en preservant les elements actifs', async () => {
    const engine = new UploadEngine()
    engine.pause()
    const ids = engine.enqueueFiles([makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')])
    engine.removeItem(ids[1])

    expect(engine.getSnapshot().items.map((item) => item.id)).toEqual([ids[0], ids[2]])

    engine.cancelItem(ids[2])
    const removed = engine.purgeItems(ids)
    expect(removed).toBe(2)
    expect(engine.getSnapshot().items).toHaveLength(0)
    engine.resume()
    engine.destroy()
  })
})

describe('nettoyage du moteur', () => {
  it('destroy() arrete les travaux et fige les enfilements', async () => {
    const engine = new UploadEngine()
    engine.pause()
    engine.enqueueFiles([makeFile()])
    engine.destroy()

    engine.enqueueFiles([makeFile('apres-destroy.pdf')])
    expect(engine.getSnapshot().items).toHaveLength(1)
    engine.resume()
    await settle()
    expect(engine.getSnapshot().items[0].status).toBe(UPLOAD_ITEM_STATUS.PENDING)
  })
})
