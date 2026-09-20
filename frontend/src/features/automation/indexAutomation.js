/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Index & Statistics Automation
 * ---------------------------------------------------------------------------
 * Frontend caches + refresh triggers for document/search/stat indexes.
 * No backend scheduler mutation — only frontend polling & invalidation.
 */

import { StatisticsApi } from '../../api/StatisticsApi'
import { SearchApi } from '../../api/SearchApi'
import { INDEX_CACHE_TTL_MS } from '../../constants/automation'

let lastStatisticsRecalc = 0
let lastSearchPrefetch = 0

/**
 * Decide if cache is stale.
 * @param {number} lastMs
 * @param {number} ttl
 * @param {number} now
 */
export function isCacheStale(lastMs, ttl = INDEX_CACHE_TTL_MS, now = Date.now()) {
  return now - lastMs > ttl
}

/**
 * Trigger statistics recalc if stale.
 * @returns {Promise<boolean>} true if triggered
 */
export async function maybeRecalculateStatistics(now = Date.now()) {
  if (!isCacheStale(lastStatisticsRecalc, INDEX_CACHE_TTL_MS, now)) return false
  try {
    await StatisticsApi.recalculate()
    lastStatisticsRecalc = now
    return true
  } catch {
    return false
  }
}

/**
 * Prefetch popular searches (warm cache).
 */
export async function prefetchSearches(now = Date.now()) {
  if (!isCacheStale(lastSearchPrefetch, INDEX_CACHE_TTL_MS, now)) return false
  try {
    await SearchApi.getPopularQueries({ limit: 10 })
    lastSearchPrefetch = now
    return true
  } catch {
    return false
  }
}

/**
 * Reset caches (for maintenance).
 */
export function refreshCaches() {
  lastStatisticsRecalc = 0
  lastSearchPrefetch = 0
}
