/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Drive Automation
 * ---------------------------------------------------------------------------
 * Monitoring health, selecting best drive, retry sync with backoff,
 * rebalancing hints. Relies solely on GoogleDriveApi + AutomationApi.
 */

import { GoogleDriveApi } from '../../api/GoogleDriveApi'
import { AutomationApi } from '../../api/AutomationApi'
import { selectBestDrive, detectImbalancedDrives, driveConnectivityStatus } from '../../utils/automation'
import { normalizeApiList } from '../../utils/academic'
import { DRIVE_SYNC_MAX_RETRIES } from '../../constants/automation'

/**
 * Fetch drives normalised.
 * @param {AbortSignal} signal
 * @returns {Promise<Array<object>>}
 */
export async function fetchDrives(signal) {
  const res = await GoogleDriveApi.list(signal ? { signal } : undefined)
  return normalizeApiList(res)
}

/**
 * Build a drive health snapshot.
 * @param {Array<object>} drives
 * @param {number} nowMs
 * @returns {Array<object>}
 */
export function buildDriveHealthSnapshot(drives, nowMs = Date.now()) {
  return (Array.isArray(drives) ? drives : []).map((d) => {
    const lastSync = d.last_sync_at ? new Date(d.last_sync_at).getTime() : NaN
    return {
      id: d.id,
      name: d.name,
      health: d.health_status || 'unknown',
      connectivity: driveConnectivityStatus(d, lastSync, nowMs),
      usage: Number(d.storage_limit) ? Math.round((Number(d.used_storage) / Number(d.storage_limit)) * 100) : null,
      priority: d.priority,
      isDefault: Boolean(d.is_default),
      available: Number(d.available_storage) || 0,
    }
  })
}

/**
 * Recommend best drive for new uploads.
 */
export function recommendDrive(drives) {
  return selectBestDrive(drives)
}

export function rebalanceCandidates(drives) {
  return detectImbalancedDrives(drives)
}

/**
 * Try syncing a drive with retry.
 * @param {number|string} driveId
 * @param {{retries?: number}} opts
 * @returns {Promise<{ok: boolean, attempts: number, error?: unknown}>}
 */
export async function syncWithRetry(driveId, opts = {}) {
  const max = Number(opts.retries ?? DRIVE_SYNC_MAX_RETRIES) || DRIVE_SYNC_MAX_RETRIES
  let lastError
  for (let attempt = 1; attempt <= max; attempt += 1) {
    try {
      await AutomationApi.synchronizeDrive(driveId)
      return { ok: true, attempts: attempt }
    } catch (err) {
      lastError = err
      if (attempt < max) await new Promise((r) => setTimeout(r, 800 * attempt))
    }
  }
  return { ok: false, attempts: max, error: lastError }
}
