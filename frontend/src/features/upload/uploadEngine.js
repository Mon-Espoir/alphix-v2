/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Moteur d'upload (file sequentielle, retry, doublons)
 * ---------------------------------------------------------------------------
 * Machine a etats agnostique du framework, exposee via useSyncExternalStore.
 *
 * Pipeline par fichier (strictement sequentiel — un transfert actif max) :
 *   1. HASHING    : empreinte SHA-256 locale chunked (annulable) ;
 *   2. CHECKING   : collision locale par hash + verification serveur
 *                   (`UploadApi.findDuplicateByHash`) ;
 *   3. DECISION   : si doublon -> AWAITING_DECISION (resolution utilisateur :
 *                   remplacer / conserver comme revision / annuler) ;
 *   4. UPLOADING  : validation serveur multipart (`UploadApi.validateFile`,
 *                   vrai transfert d'octets avec progression) puis
 *                   enregistrement du document (`DocumentApi.create`).
 *
 * Robustesse : AbortController par element, auto-retry exponentiel sur erreurs
 * reseau/serveur, pause/reprise de file, nettoyage integral des timers et
 * signaux via `destroy()`. Aucune fuite memoire en cas de demontage.
 */

import { UploadApi } from '../../api/UploadApi'
import { DocumentApi } from '../../api/DocumentApi'
import { API_ERROR_TYPES } from '../../constants/api'
import {
  UPLOAD_ITEM_STATUS,
  UPLOAD_RETRY_POLICY,
  RETRYABLE_ERROR_TYPES,
  QUEUE_INTER_ITEM_DELAY_MS,
} from '../../constants/upload'
import { normalizeApiError } from '../../utils/apiError'
import { slugify } from '../../utils/academic'
import {
  computeFileSha256,
  computeTransferSpeed,
  estimateEta,
  validateUploadFile,
  findQueueHashCollision,
  bumpDocumentVersion,
} from '../../utils/upload'

/** Poids de progression par phase (somme = 100). */
const PHASE_WEIGHTS = Object.freeze({
  HASHING: 40,
  CHECKING: 10,
  TRANSFER: 40,
  REGISTRATION: 10,
})

let engineInstanceCount = 0

/**
 * Moteur d'upload ALPHIX.
 */
export class UploadEngine {
  constructor() {
    engineInstanceCount += 1

    /** @type {Map<string, object>} Elements vivants de la file (etat mutable interne). */
    this._items = new Map()
    /** @type {string[]} Ordre d'arrivee des ids. */
    this._order = []
    /** @type {Set<(snapshot: object) => void>} */
    this._listeners = new Set()
    /** @type {Set<(event: object) => void>} */
    this._eventListeners = new Set()

    this._snapshot = null
    this._activeId = null
    this._isPaused = false
    this._pumping = false
    this._destroyed = false
    /** Timers de retry / delais internes (tous traces pour cleanup). */
    this._timers = new Set()

    // Liaison stable des methodes publiques (consommation hors classes).
    this.enqueueFiles = this.enqueueFiles.bind(this)
    this.cancelItem = this.cancelItem.bind(this)
    this.retryItem = this.retryItem.bind(this)
    this.removeItem = this.removeItem.bind(this)
    this.clearCompleted = this.clearCompleted.bind(this)
    this.purgeItems = this.purgeItems.bind(this)
    this.markClassified = this.markClassified.bind(this)
    this.resolveDuplicate = this.resolveDuplicate.bind(this)
    this.pause = this.pause.bind(this)
    this.resume = this.resume.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.onEvent = this.onEvent.bind(this)
    this.getSnapshot = this.getSnapshot.bind(this)
  }

  /* ------------------------------------------------------------------ */
  /* Souscription (contrat useSyncExternalStore)                        */
  /* ------------------------------------------------------------------ */

  /**
   * Souscrit aux changements de l'instantane.
   * @param {(snapshot: object) => void} listener - Callback invoque a chaque mutation.
   * @returns {() => void} Fonction de desabonnement.
   */
  subscribe(listener) {
    if (typeof listener !== 'function') return () => {}
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  /**
   * Instantane immutable courant (memoise : reference stable entre mutations).
   * @returns {object} Snapshot { items, activeId, isPaused, counts, stats }.
   */
  getSnapshot() {
    if (this._snapshot === null) {
      this._snapshot = this._buildSnapshot()
    }
    return this._snapshot
  }

  /**
   * Souscrit aux evenements metier (completion, echec, doublon).
   * @param {(event: {type: string, itemId: string, item: object}) => void} handler - Callback.
   * @returns {() => void} Desabonnement.
   */
  onEvent(handler) {
    if (typeof handler !== 'function') return () => {}
    this._eventListeners.add(handler)
    return () => {
      this._eventListeners.delete(handler)
    }
  }

  /** Reconstruit l'instantane et notifie les abonnes. */
  _emit() {
    this._snapshot = null
    for (const listener of this._listeners) listener(this.getSnapshot())
  }

  /** Diffuse un evenement metier aux abonnes. */
  _dispatchEvent(type, item) {
    const event = { type, itemId: item?.id ?? null, item: this._viewOf(item) }
    for (const handler of this._eventListeners) {
      try {
        handler(event)
      } catch {
        // Un consommateur defectueux ne doit jamais casser le pipeline.
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Enfilement                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Enregistre une liste de fichiers dans la file. Les fichiers invalides
   * (MIME/taille) sont admis au ledger en echec immediat avec motif — la
   * traçabilite est complete sans jamais transmettre d'octet invalide.
   *
   * @param {FileList|File[]|null} files - Fichiers selectionnes.
   * @param {{driveId?: number|string|null}} [opts] - Drive cible optionnel.
   * @returns {string[]} Identifiants crees (dans l'ordre).
   */
  enqueueFiles(files, opts = {}) {
    if (this._destroyed) return []
    const list = Array.from(files ?? [])
    const createdIds = []

    for (const file of list) {
      const id = this._nextId()
      const verdict = validateUploadFile(file)

      const item = {
        id,
        file,
        name: typeof file?.name === 'string' ? file.name : 'fichier',
        size: Number(file?.size) || 0,
        mimeType: typeof file?.type === 'string' ? file.type : '',
        lastModified: Number(file?.lastModified) || 0,
        status: verdict.valid ? UPLOAD_ITEM_STATUS.PENDING : UPLOAD_ITEM_STATUS.FAILED,
        progress: 0,
        bytesLoaded: 0,
        speed: null,
        etaMs: null,
        phaseLabel: '',
        hash: null,
        attempts: 0,
        error: verdict.valid ? null : { message: verdict.errors.join(' '), type: API_ERROR_TYPES.VALIDATION },
        duplicateOf: null,
        resolution: null,
        documentId: null,
        linkedTitle: null,
        // Classification auto/IA (POST /documents) : null = non identifié.
        courseId: null,
        docType: null,
        classified: false,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        driveId: opts.driveId ?? null,
        controller: null,
      }

      this._items.set(id, item)
      this._order.push(id)
      createdIds.push(id)
    }

    this._emit()
    this._schedulePump(0)
    return createdIds
  }

  /**
   * Identifiant unique court (mono-instance applicative + compteur).
   * @returns {string} Identifiant.
   */
  _nextId() {
    engineInstanceCount += 1
    return `up-${Date.now().toString(36)}-${engineInstanceCount}`
  }

  /* ------------------------------------------------------------------ */
  /* Controles utilisateurs                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Annule un element : abort du signal actif ou marquage direct.
   * @param {string} id - Identifiant de l'element.
   */
  cancelItem(id) {
    const item = this._items.get(id)
    if (!item) return
    if (
      item.status === UPLOAD_ITEM_STATUS.UPLOADED ||
      item.status === UPLOAD_ITEM_STATUS.CANCELLED
    ) {
      return
    }
    if (item.controller && !item.controller.signal.aborted) {
      // La boucle pipeline convertira l'AbortError en CANCELLED.
      item.controller.abort(new DOMException('Annule par l’utilisateur.', 'AbortError'))
      return
    }
    if (this._activeId === id) return
    item.status = UPLOAD_ITEM_STATUS.CANCELLED
    item.phaseLabel = ''
    item.completedAt = new Date().toISOString()
    this._emit()
    this._dispatchEvent('cancelled', item)
    this._schedulePump(0)
  }

  /**
   * Replace un element echoue en attente (reset complet des compteurs).
   * @param {string} id - Identifiant de l'element.
   */
  retryItem(id) {
    const item = this._items.get(id)
    if (!item) return
    if (item.status !== UPLOAD_ITEM_STATUS.FAILED && item.status !== UPLOAD_ITEM_STATUS.CANCELLED) {
      return
    }
    if (!item.file) return
    item.status = UPLOAD_ITEM_STATUS.PENDING
    item.progress = 0
    item.bytesLoaded = 0
    item.speed = null
    item.etaMs = null
    item.error = null
    item.attempts = 0
    item.duplicateOf = null
    item.completedAt = null
    item.durationMs = null
    item.phaseLabel = ''
    this._emit()
    this._schedulePump(0)
  }

  /**
   * Supprime definitivement un element du ledger (terminal uniquement).
   * @param {string} id - Identifiant de l'element.
   */
  removeItem(id) {
    const item = this._items.get(id)
    if (!item) return
    if (
      this._activeId === id ||
      item.status === UPLOAD_ITEM_STATUS.HASHING ||
      item.status === UPLOAD_ITEM_STATUS.CHECKING ||
      item.status === UPLOAD_ITEM_STATUS.UPLOADING
    ) {
      return
    }
    this._items.delete(id)
    this._order = this._order.filter((existing) => existing !== id)
    this._emit()
  }

  /**
   * Purge tous les elements termines avec succes.
   */
  clearCompleted() {
    let changed = false
    for (const [id, item] of this._items.entries()) {
      if (item.status === UPLOAD_ITEM_STATUS.UPLOADED) {
        this._items.delete(id)
        changed = true
      }
    }
    if (changed) {
      this._order = this._order.filter((id) => this._items.has(id))
      this._emit()
    }
  }

  /**
   * Suppression par lot (historique). Seuls les elements non actifs sont purges.
   * @param {string[]} ids - Identifiants cibles.
   * @returns {number} Nombre d'elements reellement supprimes.
   */
  purgeItems(ids) {
    if (!Array.isArray(ids)) return 0
    let removed = 0
    for (const id of ids) {
      const item = this._items.get(id)
      if (!item) continue
      if (
        this._activeId === id ||
        item.status === UPLOAD_ITEM_STATUS.HASHING ||
        item.status === UPLOAD_ITEM_STATUS.CHECKING ||
        item.status === UPLOAD_ITEM_STATUS.UPLOADING
      ) {
        continue
      }
      this._items.delete(id)
      removed += 1
    }
    if (removed > 0) {
      this._order = this._order.filter((id) => this._items.has(id))
      this._emit()
    }
    return removed
  }

  /**
   * Met la file en pause (l'element actif termine son cycle).
   */
  pause() {
    if (this._isPaused) return
    this._isPaused = true
    this._emit()
  }

  /**
   * Reprend le traitement de la file.
   */
  resume() {
    if (!this._isPaused) return
    this._isPaused = false
    this._emit()
    this._schedulePump(0)
  }

  /* ------------------------------------------------------------------ */
  /* Resolution de doublon                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Applique la decision utilisateur sur un doublon detecte.
   *  - 'replace'    : met a jour le document existant (metadonnees + version majeure) ;
   *  - 'keep_both'  : enregistre l'entrant comme nouvelle REVISION du document
   *                   existant (increment mineur + tracabilite metadata) — la
   *                   contrainte SQL `file_hash UNIQUE` interdit une seconde
   *                   ligne identique ; ce choix preserve l'integrite du hash ;
   *  - 'cancel'     : abandonne l'entrant (statut CANCELLED).
   *
   * @param {string} id - Identifiant de l'element en AWAITING_DECISION.
   * @param {'replace'|'keep_both'|'cancel'} decision - Decision utilisateur.
   * @returns {Promise<void>}
   */
  async resolveDuplicate(id, decision) {
    const item = this._items.get(id)
    if (!item || item.status !== UPLOAD_ITEM_STATUS.AWAITING_DECISION) return

    if (decision === 'cancel') {
      item.resolution = 'cancel'
      item.status = UPLOAD_ITEM_STATUS.CANCELLED
      item.phaseLabel = ''
      item.completedAt = new Date().toISOString()
      this._emit()
      this._dispatchEvent('cancelled', item)
      this._schedulePump(0)
      return
    }

    const existing = item.duplicateOf
    if (!existing?.id) {
      item.status = UPLOAD_ITEM_STATUS.FAILED
      item.error = { message: 'Document existant introuvable pour la resolution.', type: API_ERROR_TYPES.CLIENT }
      this._emit()
      this._dispatchEvent('failed', item)
      this._schedulePump(0)
      return
    }

    try {
      const nowIso = new Date().toISOString()
      const baseMetadata = [
        `duplicate_source:${item.name}`,
        `resolved_at:${nowIso}`,
      ]

      if (decision === 'replace') {
        await DocumentApi.patch(existing.id, {
          original_name: item.name,
          file_size: item.size,
          mime_type: item.mimeType || undefined,
          version: bumpDocumentVersion(existing.version, 'major'),
          metadata: [...baseMetadata, 'resolution:replace'],
        })
        item.documentId = existing.id
        item.linkedTitle = existing.title ?? null
        item.resolution = 'replace'
      } else {
        await DocumentApi.patch(existing.id, {
          version: bumpDocumentVersion(existing.version, 'minor'),
          metadata: [...baseMetadata, 'resolution:revision'],
        })
        item.documentId = existing.id
        item.linkedTitle = existing.title ?? null
        item.resolution = 'keep_both'
      }

      item.status = UPLOAD_ITEM_STATUS.UPLOADED
      item.progress = 100
      item.phaseLabel = ''
      item.completedAt = new Date().toISOString()
      item.durationMs = item.startedAt ? Date.now() - item.startedAt : null
      this._emit()
      this._dispatchEvent('completed', item)
    } catch (rawError) {
      const error = normalizeApiError(rawError)
      item.status = UPLOAD_ITEM_STATUS.FAILED
      item.error = { message: error.message, type: error.type }
      this._emit()
      this._dispatchEvent('failed', item)
    } finally {
      this._activeId = null
      this._schedulePump(QUEUE_INTER_ITEM_DELAY_MS)
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boucle sequentielle                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Planifie le prochain tour de pompe — TOUJOURS differé (jamais synchrone
   * dans l'appelant) afin que l'enfilement reste une operation pure et que
   * les snapshots React observent un etat stable.
   * @param {number} [delayMs=0] - Delai avant le tour de pompe.
   */
  _schedulePump(delayMs = 0) {
    if (this._destroyed) return
    const timer = setTimeout(() => {
      this._timers.delete(timer)
      this._pump()
    }, Math.max(0, Number(delayMs) || 0))
    this._timers.add(timer)
  }

  /**
   * Demarre le prochain element eligible si la file n'est pas en pause.
   */
  _pump() {
    if (this._destroyed || this._pumping || this._isPaused || this._activeId) return

    const nextId = this._order.find((id) => this._items.get(id)?.status === UPLOAD_ITEM_STATUS.PENDING)
    if (!nextId) return

    const item = this._items.get(nextId)
    this._activeId = nextId
    this._runItem(item)
  }

  /**
   * Execute le pipeline complet d'un element (hachage -> verification ->
   * transfert -> enregistrement), avec retries exponentiels.
   * @param {object} item - Element interne (mutable).
   */
  async _runItem(item) {
    item.controller = new AbortController()
    item.startedAt = Date.now()
    item.attempts = 0

    try {
      // ---- Phase 1 : hachage local -----------------------------------
      this._transition(item, UPLOAD_ITEM_STATUS.HASHING, 'Calcul de l’empreinte SHA-256')
      item.hash = await computeFileSha256(item.file, {
        signal: item.controller.signal,
        onProgress: (bytesRead, totalBytes) => {
          const ratio = totalBytes > 0 ? bytesRead / totalBytes : 1
          this._setProgress(item, ratio * PHASE_WEIGHTS.HASHING, bytesRead, null, null)
        },
      })

      this._ensureAlive(item)

      // ---- Phase 2 : collisions & verification serveur ---------------
      this._transition(item, UPLOAD_ITEM_STATUS.CHECKING, 'Detection de doublons')
      this._setProgress(
        item,
        PHASE_WEIGHTS.HASHING + PHASE_WEIGHTS.CHECKING / 2,
        item.size,
        null,
        null,
      )

      const localCollision = findQueueHashCollision(
        item.hash,
        Array.from(this._items.values()).filter((other) => other.id !== item.id),
      )
      if (localCollision) {
        this._flagDuplicate(item, {
          id: null,
          title: localCollision.name,
          version: null,
        }, 'file')
        return
      }

      await this._checkServerDuplicateWithRetry(item)

      this._ensureAlive(item)

      // Doublon serveur detecte : la decision utilisateur est requise —
      // le pipeline s'arrete ici (reprise via resolveDuplicate).
      if (item.status === UPLOAD_ITEM_STATUS.AWAITING_DECISION) return

      // ---- Phase 3 : transfert + enregistrement ----------------------
      this._transition(item, UPLOAD_ITEM_STATUS.UPLOADING, 'Validation serveur')
      await this._transferWithRetry(item)
      this._ensureAlive(item)
      this._transition(item, UPLOAD_ITEM_STATUS.UPLOADING, 'Enregistrement du document')
      await this._registerWithRetry(item)

      // ---- Succes -----------------------------------------------------
      item.status = UPLOAD_ITEM_STATUS.UPLOADED
      item.progress = 100
      item.bytesLoaded = item.size
      item.speed = null
      item.etaMs = null
      item.phaseLabel = ''
      item.completedAt = new Date().toISOString()
      item.durationMs = Date.now() - item.startedAt
      this._emit()
      this._dispatchEvent('completed', item)
    } catch (rawError) {
      this._handleItemFailure(item, rawError)
    } finally {
      if (this._activeId === item.id) this._activeId = null
      item.controller = null
      this._schedulePump(QUEUE_INTER_ITEM_DELAY_MS)
    }
  }

  /**
   * Verification serveur de doublon avec politique de retry.
   * 404 = aucun doublon (flux nominal).
   * @param {object} item - Element interne.
   */
  async _checkServerDuplicateWithRetry(item) {
    try {
      const existing = await UploadApi.findDuplicateByHash(item.hash)
      if (existing && (existing.id != null || existing.data?.id != null)) {
        const document = existing.id != null ? existing : existing.data
        this._flagDuplicate(item, document, 'server')
      }
    } catch (rawError) {
      const error = normalizeApiError(rawError)
      if (error.status === 404) return
      if (this._shouldRetry(error, item)) {
        await this._retryOrThrow(item, () => this._checkServerDuplicateWithRetry(item))
        return
      }
      throw error
    }
  }

  /**
   * Transfert multipart (validation serveur) avec progression et retries.
   * @param {object} item - Element interne.
   */
  async _transferWithRetry(item) {
    try {
      const formData = new FormData()
      formData.append('file', item.file, item.name)

      const transferStartedAt = performance.now()
      await UploadApi.validateFile(formData, {
        signal: item.controller.signal,
        onUploadProgress: (progressEvent) => {
          const loaded = Number(progressEvent?.loaded) || 0
          const total = Number(progressEvent?.total) || item.size || 0
          const ratio = total > 0 ? Math.min(1, loaded / total) : 0
          const speed = computeTransferSpeed(loaded, transferStartedAt, performance.now())
          this._setProgress(
            item,
            PHASE_WEIGHTS.HASHING + PHASE_WEIGHTS.CHECKING + ratio * PHASE_WEIGHTS.TRANSFER,
            loaded,
            speed,
            estimateEta(Math.max(0, total - loaded), speed),
            `Transfert ${Math.round(ratio * 100)} %`,
          )
        },
      })
    } catch (rawError) {
      const error = normalizeApiError(rawError)
      if (error.type === API_ERROR_TYPES.CANCELLED) throw new DOMException('Transfert annule.', 'AbortError')
      if (this._shouldRetry(error, item)) {
        await this._retryOrThrow(item, () => this._transferWithRetry(item))
        return
      }
      throw error
    }
  }

  /**
   * Enregistrement du document via DocumentApi avec retries.
   * @param {object} item - Element interne.
   */
  async _registerWithRetry(item) {
    try {
      const titleBase = item.name.replace(/\.[^.]+$/, '') || item.name
      const fd = new FormData()
      fd.append('title', titleBase)
      fd.append('original_name', item.name)
      fd.append('slug', `${slugify(titleBase) || 'document'}-${Date.now().toString(36)}`)
      fd.append('doc_type', 'other')
      if (item.mimeType) fd.append('mime_type', item.mimeType)
      fd.append('file_size', String(item.size))
      fd.append('file_hash', item.hash)
      fd.append('visibility', 'public')
      fd.append('status', 'pending')
      fd.append('version', '1.0')
      if (item.driveId != null) fd.append('google_drive_id', String(Number(item.driveId)))
      fd.append('metadata[]', `upload_engine:v2`)
      fd.append('metadata[]', `uploaded_at:${new Date().toISOString()}`)
      // Transmission binaire indispensable pour POST /api/v1/documents
      if (item.file) fd.append('file', item.file, item.name)
      const created = await DocumentApi.create(fd, { signal: item.controller.signal })
      const createdDoc = created?.data && typeof created.data === 'object' && !Array.isArray(created.data)
        ? created.data
        : created
      item.documentId = createdDoc?.id ?? null
      // Mémorise la classification auto/IA pour le fallback guidé :
      // cours manquant ou type générique => sélection hiérarchique proposée.
      item.courseId = createdDoc?.course_id ?? createdDoc?.course?.id ?? null
      item.docType = createdDoc?.doc_type ?? null
      this._setProgress(
        item,
        PHASE_WEIGHTS.HASHING + PHASE_WEIGHTS.CHECKING + PHASE_WEIGHTS.TRANSFER + PHASE_WEIGHTS.REGISTRATION,
        item.size,
        null,
        null,
      )
    } catch (rawError) {
      const error = normalizeApiError(rawError)
      if (error.type === API_ERROR_TYPES.CANCELLED) throw new DOMException('Enregistrement annule.', 'AbortError')
      if (this._shouldRetry(error, item)) {
        await this._retryOrThrow(item, () => this._registerWithRetry(item))
        return
      }
      throw error
    }
  }

  /**
   * Marque un element comme classifié manuellement (fallback UploadModal).
   * @param {string} id - Identifiant de l'element.
   * @param {{courseId?: number|string|null, docType?: string|null}} [classification] - Cours/type confirmés.
   */
  markClassified(id, classification = {}) {
    const item = this._items.get(id)
    if (!item) return
    if (classification.courseId != null) item.courseId = classification.courseId
    if (classification.docType != null) item.docType = classification.docType
    item.classified = true
    this._emit()
  }

  /**
   * Marque un element comme doublon en attente de decision.
   * @param {object} item - Element interne.
   * @param {object|null} document - Document existant (API ou file locale).
   * @param {'file'|'server'} origin - Origine de la detection.
   */
  _flagDuplicate(item, document, origin) {
    item.status = UPLOAD_ITEM_STATUS.AWAITING_DECISION
    item.duplicateOf = {
      id: document?.id ?? null,
      title: document?.title ?? null,
      original_name: document?.original_name ?? null,
      file_size: document?.file_size ?? null,
      version: document?.version ?? null,
      created_at: document?.created_at ?? null,
      origin,
    }
    item.phaseLabel = 'Doublon detecte'
    item.progress = PHASE_WEIGHTS.HASHING + PHASE_WEIGHTS.CHECKING
    this._emit()
    this._dispatchEvent('duplicate', item)
  }

  /**
   * Garde d'integrite : interrompt le pipeline si le moteur a ete detruit ou
   * si l'element a ete annule pendant un await. Empeche tout travail fantome
   * (appels API, emissions) apres nettoyage — aucune fuite possible.
   * @param {object} item - Element interne.
   */
  _ensureAlive(item) {
    if (this._destroyed) {
      throw new DOMException('Moteur detruit.', 'AbortError')
    }
    if (item.controller?.signal.aborted) {
      throw new DOMException('Pipeline annule.', 'AbortError')
    }
  }

  /**
   * Normalise toute erreur de pipeline en echec/annulation/decision finale.
   * @param {object} item - Element interne.
   * @param {unknown} rawError - Erreur brute.
   */
  _handleItemFailure(item, rawError) {
    const isAbort =
      rawError instanceof DOMException
        ? rawError.name === 'AbortError'
        : rawError?.name === 'AbortError'

    if (isAbort) {
      item.status = UPLOAD_ITEM_STATUS.CANCELLED
      item.phaseLabel = ''
      item.speed = null
      item.etaMs = null
      item.completedAt = new Date().toISOString()
      item.durationMs = item.startedAt ? Date.now() - item.startedAt : null
      this._emit()
      this._dispatchEvent('cancelled', item)
      return
    }

    const error = normalizeApiError(rawError)
    item.status = UPLOAD_ITEM_STATUS.FAILED
    item.error = { message: error.message, type: error.type }
    item.phaseLabel = ''
    item.speed = null
    item.etaMs = null
    item.completedAt = new Date().toISOString()
    item.durationMs = item.startedAt ? Date.now() - item.startedAt : null
    this._emit()
    this._dispatchEvent('failed', item)
  }

  /**
   * Decide si l'erreur courante autorise une nouvelle tentative.
   * @param {import('../../utils/apiError').ApiError} error - Erreur normalisee.
   * @param {object} item - Element interne.
   * @returns {boolean} true si retry possible.
   */
  _shouldRetry(error, item) {
    if (item.controller?.signal.aborted) return false
    if (item.attempts >= UPLOAD_RETRY_POLICY.MAX_ATTEMPTS - 1) return false
    return RETRYABLE_ERROR_TYPES.includes(error.type)
  }

  /**
   * Planifie un retry differe (backoff exponentiel) ou bascule en echec.
   * @param {object} item - Element interne.
   * @param {() => Promise<void>} step - Etape a rejouer.
   * @returns {Promise<void>}
   */
  _retryOrThrow(item, step) {
    item.attempts += 1
    const delayIndex = item.attempts
    const delay = Math.min(
      UPLOAD_RETRY_POLICY.BASE_DELAY_MS * UPLOAD_RETRY_POLICY.FACTOR ** (delayIndex - 1),
      UPLOAD_RETRY_POLICY.MAX_DELAY_MS,
    )
    item.phaseLabel = `Nouvelle tentative (${item.attempts + 1}/${UPLOAD_RETRY_POLICY.MAX_ATTEMPTS})`
    this._emit()

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._timers.delete(timer)
        if (item.controller?.signal.aborted) {
          reject(new DOMException('Retry annule.', 'AbortError'))
          return
        }
        step().then(resolve, reject)
      }, delay)
      this._timers.add(timer)
    })
  }

  /* ------------------------------------------------------------------ */
  /* Etat interne & vues                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Transition de statut + label de phase.
   * @param {object} item - Element interne.
   * @param {string} status - Nouveau statut.
   * @param {string} phaseLabel - Label de phase affichable.
   */
  _transition(item, status, phaseLabel) {
    item.status = status
    item.phaseLabel = phaseLabel
    this._emit()
  }

  /**
   * Met a jour progression/vitesse/ETA puis notifie (throttle implicite :
   * les callbacks navigateur sont deja cadences).
   * @param {object} item - Element interne.
   * @param {number} progress - Pourcentage global 0-100.
   * @param {number} bytesLoaded - Octets traites.
   * @param {number|null} speed - Vitesse octets/s.
   * @param {number|null} etaMs - ETA ms.
   * @param {string} [phaseLabel] - Label de phase optionnel.
   */
  _setProgress(item, progress, bytesLoaded, speed, etaMs, phaseLabel) {
    item.progress = Math.min(100, Math.max(0, Math.round(progress)))
    item.bytesLoaded = Math.max(0, Number(bytesLoaded) || 0)
    item.speed = Number.isFinite(speed) ? speed : null
    item.etaMs = Number.isFinite(etaMs) ? etaMs : null
    if (phaseLabel) item.phaseLabel = phaseLabel
    this._emit()
  }

  /**
   * Vue publique immuable d'un element (aucune reference interne exposee).
   * @param {object|null} item - Element interne.
   * @returns {object|null} Vue figee.
   */
  _viewOf(item) {
    if (!item) return null
    const view = {
      id: item.id,
      name: item.name,
      size: item.size,
      mimeType: item.mimeType,
      status: item.status,
      progress: item.progress,
      bytesLoaded: item.bytesLoaded,
      speed: item.speed,
      etaMs: item.etaMs,
      phaseLabel: item.phaseLabel,
      hash: item.hash,
      attempts: item.attempts,
      error: item.error,
      duplicateOf: item.duplicateOf,
      resolution: item.resolution,
      documentId: item.documentId,
      linkedTitle: item.linkedTitle,
      courseId: item.courseId,
      docType: item.docType,
      classified: item.classified,
      // Fallback guidé requis : cours non identifié OU type générique,
      // et pas encore classifié manuellement via UploadModal.
      needsClassification:
        !item.classified
        && (item.courseId == null || item.docType == null || item.docType === 'other'),
      startedAt: item.startedAt ? new Date(item.startedAt).toISOString() : null,
      completedAt: item.completedAt,
      durationMs: item.durationMs,
      hasFile: Boolean(item.file),
    }
    return Object.freeze(view)
  }

  /**
   * Construit l'instantane public complet (items + agregats).
   * @returns {object} Snapshot immutable.
   */
  _buildSnapshot() {
    const items = this._order.map((id) => this._viewOf(this._items.get(id))).filter(Boolean)
    const counts = {
      total: items.length,
      pending: 0,
      uploading: 0,
      uploaded: 0,
      failed: 0,
      cancelled: 0,
      duplicates: 0,
    }
    let uploadedTodayCount = 0
    let totalBytesUploaded = 0
    let durationSamples = 0
    let durationSum = 0
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    for (const item of items) {
      switch (item.status) {
        case UPLOAD_ITEM_STATUS.PENDING:
        case UPLOAD_ITEM_STATUS.HASHING:
        case UPLOAD_ITEM_STATUS.CHECKING:
          counts.pending += 1
          break
        case UPLOAD_ITEM_STATUS.AWAITING_DECISION:
          counts.duplicates += 1
          break
        case UPLOAD_ITEM_STATUS.UPLOADING:
          counts.uploading += 1
          break
        case UPLOAD_ITEM_STATUS.UPLOADED:
          counts.uploaded += 1
          totalBytesUploaded += item.size
          durationSamples += 1
          durationSum += item.durationMs ?? 0
          if (item.completedAt && new Date(item.completedAt) >= startOfDay) {
            uploadedTodayCount += 1
          }
          break
        case UPLOAD_ITEM_STATUS.FAILED:
          counts.failed += 1
          break
        case UPLOAD_ITEM_STATUS.CANCELLED:
          counts.cancelled += 1
          break
        default:
          break
      }
    }

    return Object.freeze({
      items,
      activeId: this._activeId,
      isPaused: this._isPaused,
      counts: Object.freeze(counts),
      stats: Object.freeze({
        uploadedTodayCount,
        averageDurationMs: durationSamples > 0 ? Math.round(durationSum / durationSamples) : null,
        totalBytesUploaded,
      }),
    })
  }

  /**
   * Nettoyage integral : timers, signaux actifs, abonnements. Apres appel,
   * le moteur n'accepte plus aucun travail (garde-fou anti-fuite).
   */
  destroy() {
    this._destroyed = true
    for (const timer of this._timers) clearTimeout(timer)
    this._timers.clear()
    for (const item of this._items.values()) {
      if (item.controller && !item.controller.signal.aborted) {
        item.controller.abort(new DOMException('Moteur detruit.', 'AbortError'))
      }
    }
    this._listeners.clear()
    this._eventListeners.clear()
  }
}

/** Instance applicative unique du moteur d'upload. */
export const uploadEngine = new UploadEngine()

export default uploadEngine
