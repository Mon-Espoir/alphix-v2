/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Automation Status Card
 * ---------------------------------------------------------------------------
 */

import Card from '../ui/Card'
import Badge from '../ui/Badge'

export default function AutomationStatusCard({ title, status = 'idle', detail, actions, className = '' }) {
  const variant = status === 'healthy' || status === 'ok' ? 'success' : status === 'warning' || status === 'stale' ? 'warning' : status === 'error' || status === 'offline' ? 'danger' : 'default'
  return (
    <Card className={['ax-automation-card', className].filter(Boolean).join(' ')}>
      <div className="ax-automation-card__head">
        <h3 className="ax-automation-card__title">{title}</h3>
        <Badge variant={variant} size="sm">{status}</Badge>
      </div>
      {detail && <p className="ax-automation-card__detail">{detail}</p>}
      {actions && <div className="ax-automation-card__actions">{actions}</div>}
    </Card>
  )
}
