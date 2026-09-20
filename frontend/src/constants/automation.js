/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Automation Platform constants
 * ---------------------------------------------------------------------------
 * Front-end only scheduler values — no backend mutation.
 */

/** Intervals (ms) for polling engines. */
export const AUTOMATION_INTERVALS = Object.freeze({
  DRIVE_HEALTH: 60_000,
  STORAGE_REBALANCE: 300_000,
  SYNC_RETRY: 30_000,
  SEARCH_REINDEX: 120_000,
  STATISTICS: 60_000,
  MAINTENANCE: 300_000,
})

/** Confidence threshold below which user confirmation is required. */
export const AUTOMATION_CONFIDENCE_THRESHOLD = 0.65

/** Max sync retry attempts before notifying failure. */
export const DRIVE_SYNC_MAX_RETRIES = 3

/** Cache TTL for indexes (ms). */
export const INDEX_CACHE_TTL_MS = 90_000

/** Supported document types for auto-suggestion (mirrors backend DOC_TYPES). */
export const AUTOMATION_DOC_TYPES = Object.freeze([
  'course',
  'tp',
  'td',
  'exam',
  'correction',
  'syllabus',
  'summary',
  'book',
  'thesis',
  'report',
  'presentation',
  'video',
  'other',
])
