/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Grille KPI Administration
 * ---------------------------------------------------------------------------
 * Grille responsive de cartes KPI basée sur `StatCard`.
 * Mobile-first, 1 -> 2 -> 3 -> 4 colonnes.
 */

import StatCard from '../ui/StatCard'

export default function AdminKpiGrid({ items = [], className = '' }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div className={['ax-admin-kpi-grid', className].filter(Boolean).join(' ')} role="list">
      {items.map((item) => (
        <div key={item.key} role="listitem">
          <StatCard label={item.label} value={item.value} icon={item.icon} trend={item.trend} trendLabel={item.trendLabel} />
        </div>
      ))}
    </div>
  )
}
