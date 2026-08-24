/**
 * ALPHIX V2 — StatCard
 */

export default function StatCard({ icon, label, value, trend, trendLabel, className = '' }) {
  return (
    <div className={['ax-stat-card', className].filter(Boolean).join(' ')}>
      {icon && <div className="ax-stat-card__icon">{icon}</div>}
      <div className="ax-stat-card__content">
        <span className="ax-stat-card__label">{label}</span>
        <span className="ax-stat-card__value">{value}</span>
        {trend != null && (
          <span className={`ax-stat-card__trend ${trend > 0 ? 'ax-stat-card__trend--up' : trend < 0 ? 'ax-stat-card__trend--down' : ''}`}>
            {trend > 0 ? '+' : ''}{trend}%
            {trendLabel && <span className="ax-stat-card__trend-label">{trendLabel}</span>}
          </span>
        )}
      </div>
    </div>
  )
}
