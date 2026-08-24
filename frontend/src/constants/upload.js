/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Constantes du module Upload & Stockage
 * ---------------------------------------------------------------------------
 * Source unique des statuts de file d'attente, contraintes de validation
 * (alignees sur `UploadService` + validation Laravel), politique de retry et
 * groupes de filtrage de l'historique. Aucune valeur magique ailleurs.
 */

import { API_ERROR_TYPES } from './api'

/** Cycle de vie d'un element de la file d'attente. */
export const UPLOAD_ITEM_STATUS = Object.freeze({
  /** En file, pas encore demarree. */
  PENDING: 'pending',
  /** Calcul local de l'empreinte SHA-256 en cours. */
  HASHING: 'hashing',
  /** Validation serveur + detection de doublon en cours. */
  CHECKING: 'checking',
  /** Doublon detecte — decision utilisateur requise. */
  AWAITING_DECISION: 'awaiting_decision',
  /** Transfert / enregistrement en cours. */
  UPLOADING: 'uploading',
  /** Termine avec succes. */
  UPLOADED: 'uploaded',
  /** Echec definitif (apres epuisement des retries ou erreur non retentable). */
  FAILED: 'failed',
  /** Annulee par l'utilisateur ou rejet de doublon. */
  CANCELLED: 'cancelled',
})

/** Groupes de filtrage de l'historique (statuts agreges). */
export const UPLOAD_STATUS_GROUPS = Object.freeze({
  ALL: 'all',
  PENDING: 'pending',
  UPLOADING: 'uploading',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
})

/**
 * Mapping groupe -> ensemble de statuts bruts correspondants.
 * Utilise par le filtre de l'historique.
 */
export const UPLOAD_GROUP_STATUSES = Object.freeze({
  [UPLOAD_STATUS_GROUPS.ALL]: null,
  [UPLOAD_STATUS_GROUPS.PENDING]: Object.freeze([
    UPLOAD_ITEM_STATUS.PENDING,
    UPLOAD_ITEM_STATUS.HASHING,
    UPLOAD_ITEM_STATUS.CHECKING,
    UPLOAD_ITEM_STATUS.AWAITING_DECISION,
  ]),
  [UPLOAD_STATUS_GROUPS.UPLOADING]: Object.freeze([UPLOAD_ITEM_STATUS.UPLOADING]),
  [UPLOAD_STATUS_GROUPS.UPLOADED]: Object.freeze([UPLOAD_ITEM_STATUS.UPLOADED]),
  [UPLOAD_STATUS_GROUPS.FAILED]: Object.freeze([UPLOAD_ITEM_STATUS.FAILED]),
  [UPLOAD_STATUS_GROUPS.CANCELLED]: Object.freeze([UPLOAD_ITEM_STATUS.CANCELLED]),
})

/** Libelles lisibles des statuts (UI FR). */
export const UPLOAD_STATUS_LABELS = Object.freeze({
  [UPLOAD_ITEM_STATUS.PENDING]: 'En attente',
  [UPLOAD_ITEM_STATUS.HASHING]: 'Empreinte...',
  [UPLOAD_ITEM_STATUS.CHECKING]: 'Verification...',
  [UPLOAD_ITEM_STATUS.AWAITING_DECISION]: 'Doublon detecte',
  [UPLOAD_ITEM_STATUS.UPLOADING]: 'Envoi...',
  [UPLOAD_ITEM_STATUS.UPLOADED]: 'Envoye',
  [UPLOAD_ITEM_STATUS.FAILED]: 'Echec',
  [UPLOAD_ITEM_STATUS.CANCELLED]: 'Annule',
})

/** Variante Badge design system associee a chaque statut. */
export const UPLOAD_STATUS_BADGES = Object.freeze({
  [UPLOAD_ITEM_STATUS.PENDING]: 'default',
  [UPLOAD_ITEM_STATUS.HASHING]: 'primary',
  [UPLOAD_ITEM_STATUS.CHECKING]: 'primary',
  [UPLOAD_ITEM_STATUS.AWAITING_DECISION]: 'warning',
  [UPLOAD_ITEM_STATUS.UPLOADING]: 'primary',
  [UPLOAD_ITEM_STATUS.UPLOADED]: 'success',
  [UPLOAD_ITEM_STATUS.FAILED]: 'danger',
  [UPLOAD_ITEM_STATUS.CANCELLED]: 'default',
})

/**
 * Contraintes de validation strictes — miroir exact du backend :
 *   - MIME : liste blanche `UploadService::$allowedMimeTypes` ;
 *   - Taille : gate la plus stricte entre UploadController (`max:20480` Ko
 *     soit 20 Mo) et UploadService (50 Mo) => 20 Mo retenus.
 */
export const UPLOAD_CONSTRAINTS = Object.freeze({
  MAX_SIZE_BYTES: 20 * 1024 * 1024,
  ALLOWED_MIME_TYPES: Object.freeze([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
  ]),
})

/** Politique de retry automatique sur erreurs reseau/serveur. */
export const UPLOAD_RETRY_POLICY = Object.freeze({
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  FACTOR: 2,
})

/** Taille de chunk de lecture pour le hachage SHA-256 local (4 Mo). */
export const HASH_CHUNK_SIZE = 4 * 1024 * 1024

/** Delai (ms) entre deux elements consecutifs de la file (laisse respirer l'UI). */
export const QUEUE_INTER_ITEM_DELAY_MS = 150

/** Types d'erreur retentables automatiquement (taxonomie ApiError). */
export const RETRYABLE_ERROR_TYPES = Object.freeze([
  API_ERROR_TYPES.NETWORK,
  API_ERROR_TYPES.TIMEOUT,
  API_ERROR_TYPES.SERVER,
])

/**
 * Attribut `accept` derive de la liste blanche MIME (input file).
 * Les extensions couvrent les navigateurs qui ignorent les MIME seuls.
 */
export const UPLOAD_ACCEPT_ATTRIBUTE = Object.freeze(
  [
    '.pdf',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.jpg',
    '.jpeg',
    '.png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
  ].join(','),
)
