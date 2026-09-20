/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Maintenance Report Card
 * ---------------------------------------------------------------------------
 */

import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

export default function MaintenanceReportCard({ report, onRefresh }) {
  if (!report) return <Card className="ax-card--padded"><p className="ax-text--muted">Aucun rapport disponible.</p></Card>
  return (
    <Card className="ax-card--padded">
      <h3 className="ax-automation-card__title">Maintenance</h3>
      <p className="ax-text--muted">{report.summary}</p>
      <ul className="ax-automation-report__meta">
        <li><Badge variant="warning" size="sm">{report.candidates.length} à vérifier</Badge></li>
        <li><Badge variant={report.integrity.broken.length ? 'danger' : 'success'} size="sm">{report.integrity.broken.length} incohérences</Badge></li>
      </ul>
      {report.integrity.warnings.length > 0 && (
        <ul className="ax-automation-report__warnings" role="list">
          {report.integrity.warnings.map((w, i) => <li key={i} className="ax-text--sm">{w}</li>)}
        </ul>
      )}
      <div className="ax-automation-card__actions">
        <Button variant="ghost" size="sm" onClick={onRefresh}>Rafraîchir</Button>
      </div>
    </Card>
  )
}
