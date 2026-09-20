/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Monitoring hooks (production)
 * ---------------------------------------------------------------------------
 * Lightweight performance / error hooks — no PII, no token, no payload.
 * Extensible vers Sentry / LogRocket en production (inject via env).
 */

/**
 * Observe Largest Contentful Paint (LCP) si disponible.
 * @param {(metric: {name: string, value: number}) => void} onMetric
 * @returns {() => void} cleanup
 */
export function observeLCP(onMetric) {
  if (typeof PerformanceObserver === 'undefined') return () => {}
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (typeof onMetric === 'function') {
          onMetric({ name: 'LCP', value: entry.startTime })
        }
      }
    })
    obs.observe({ type: 'largest-contentful-paint', buffered: true })
    return () => obs.disconnect()
  } catch {
    return () => {}
  }
}

/**
 * Totaux d'erreurs API par type (compteur memoire, non persistant).
 */
const errorCounters = new Map()

/**
 * Enregistre une erreur sans fuite de donnees sensibles.
 * @param {string} type - API_ERROR_TYPES key
 */
export function countApiError(type) {
  const prev = errorCounters.get(type) || 0
  errorCounters.set(type, prev + 1)
}

/**
 * Snapshot des compteurs (pour rapport maintenance).
 * @returns {Record<string, number>}
 */
export function getErrorCounters() {
  return Object.fromEntries(errorCounters.entries())
}
