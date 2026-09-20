/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Drive Health Indicator
 * ---------------------------------------------------------------------------
 */

import Badge from '../ui/Badge'

export default function DriveHealthIndicator({ snapshot = [] }) {
  if (!Array.isArray(snapshot) || snapshot.length === 0) {
    return <p className="ax-text--muted">Aucune donnée de santé disponible.</p>
  }
  return (
    <ul className="ax-automation-drive-list" role="list">
      {snapshot.map((d) => (
        <li key={d.id} className="ax-automation-drive-list__item">
          <span className="ax-automation-drive-list__name">{d.name}</span>
          <span className="ax-automation-drive-list__badges">
            <Badge variant={d.health === 'healthy' ? 'success' : d.health === 'warning' ? 'warning' : d.health === 'critical' ? 'danger' : 'default'} size="sm">{d.health}</Badge>
            <Badge variant={d.connectivity === 'healthy' ? 'success' : d.connectivity === 'stale' ? 'warning' : 'danger'} size="sm">{d.connectivity}</Badge>
            {d.usage != null && <Badge variant={d.usage > 80 ? 'danger' : d.usage > 60 ? 'warning' : 'default'} size="sm">{d.usage}%</Badge>}
          </span>
        </li>
      ))}
    </ul>
  )
}
