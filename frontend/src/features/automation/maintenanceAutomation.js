/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Maintenance Automation (frontend only)
 * ---------------------------------------------------------------------------
 */

import { cleanupCandidates, verifyIntegrity } from '../../utils/automation'
import { DocumentApi } from '../../api/DocumentApi'
import { normalizeApiList } from '../../utils/academic'

/**
 * Build a maintenance report from current state.
 * @param {{documents: Array<object>, drives: Array<object>}} state
 * @param {Date} now
 * @returns {{candidates: Array<object>, integrity: object, summary: string}}
 */
export function buildMaintenanceReport(state, now = new Date()) {
  const docs = Array.isArray(state.documents) ? state.documents : []
  const drives = Array.isArray(state.drives) ? state.drives : []
  const candidates = cleanupCandidates(docs, now)
  const integrity = verifyIntegrity(docs, drives)
  const parts = []
  parts.push(`${candidates.length} document(s) éligibles au nettoyage (>7j, failed/pending).`)
  parts.push(integrity.broken.length ? `${integrity.broken.length} document(s) avec drive manquant.` : 'Intégrité des drives OK.')
  if (integrity.warnings.length) parts.push(...integrity.warnings)
  return { candidates, integrity, summary: parts.join(' ') }
}

/**
 * Fetch latest documents for maintenance (helper).
 * @param {AbortSignal} signal
 */
export async function fetchDocumentsForMaintenance(signal) {
  const res = await DocumentApi.list({ per_page: 200, signal: signal ? { signal } : undefined })
  return normalizeApiList(res)
}
