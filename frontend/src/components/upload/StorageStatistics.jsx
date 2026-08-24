/**
 * ALPHIX V2 — StorageStatistics
 * Tableau de bord analytique : envois aujourd'hui, vitesse moyenne, stockage total,
 * capacite restante, serie historique (barres CSS pures).
 */

import StatCard from '../ui/StatCard'
import { formatBytes, formatDuration, buildDailyVolumeSeries } from '../../utils/upload'
import { aggregateStorage } from '../../utils/drive'

const DOCUMENT_ICON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>
)
const SPEED_ICON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12a8 8 0 0 1 11.3-7.1M20 12v4h-4" /></svg>
)
const STORAGE_ICON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 8v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M4 12h16" /></svg>
)
const AVAILABLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M10 2a6 6 0 0 1 0 12M10 2a6 6 0 0 0 0 12" /></svg>
)

/**
 * @param {object} props
 * @param {object} props.stats - {uploadedTodayCount, averageDurationMs, totalBytesUploaded}
 * @param {object[]|null} props.drives - Drives pour calcul capacite globale.
 * @param {object[]|null} props.history - Ledger pour serie historique.
 * @param {number} [props.days=7] - Nombre de jours pour l'historique.
 * @param {string} [props.className]
 */
export default function StorageStatistics({
  stats,
  drives,
  history,
  days = 7,
  className = '',
}) {
  const storage = aggregateStorage(drives)
  const hasCapacity = storage.hasCapacityData
  const totalUsed = storage.totalUsed
  const totalAvailable = storage.totalAvailable
  const totalLimit = storage.totalLimit

  const series = buildDailyVolumeSeries(history, days)
  const maxVolume = Math.max(...series.map((d) => d.bytes), 1)

  return (
    <section className={['ax-storage-statistics', className].filter(Boolean).join(' ')} aria-label="Statistiques de stockage">
      {/* Grille de 4 cartes principales */}
      <div className="ax-storage-statistics__grid">
        <StatCard
          icon={DOCUMENT_ICON}
          label="Envois aujourd'hui"
          value={stats?.uploadedTodayCount ?? 0}
        />
        <StatCard
          icon={SPEED_ICON}
          label="Duree moyenne"
          value={formatDuration(stats?.averageDurationMs ?? null)}
        />
        <StatCard
          icon={STORAGE_ICON}
          label="Stockage consomme"
          value={formatBytes(totalUsed)}
        />
        <StatCard
          icon={AVAILABLE_ICON}
          label={hasCapacity ? 'Capacite restante' : 'Disponible'}
          value={hasCapacity && totalLimit != null ? formatBytes(totalLimit - totalUsed) : formatBytes(totalAvailable)}
          trend={hasCapacity && totalLimit ? Math.round(((totalLimit - totalUsed) / totalLimit) * 100) : null}
          trendLabel={hasCapacity ? 'restant' : undefined}
        />
      </div>

      {/* Serie historique (derniers N jours) */}
      {history && history.length > 0 && (
        <div className="ax-storage-statistics__history" aria-label={`Volume des ${days} derniers jours`}>
          <h3 className="ax-storage-statistics__history-title">Volume recents ({days} j)</h3>
          <div className="ax-storage-statistics__bars" role="img" aria-label="Barres de volume quotidien">
            {series.map((point) => (
              <div
                key={point.date}
                className="ax-storage-statistics__bar-wrap"
                style={{
                  '--bar-height': `${Math.max(5, (point.bytes / maxVolume) * 100)}%`,
                }}
              >
                <div className="ax-storage-statistics__bar" />
                <span className="ax-storage-statistics__bar-label">{point.label}</span>
                <span className="ax-storage-statistics__bar-value">{formatBytes(point.bytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {drives && drives.length > 0 && (
        <div className="ax-storage-statistics__drives-summary">
          <h3 className="ax-storage-statistics__history-title">Flotte de drives ({drives.length})</h3>
          <dl className="ax-storage-statistics__drives-meta">
            <div>
              <dt>Total utilise</dt>
              <dd>{formatBytes(totalUsed)}</dd>
            </div>
            {hasCapacity && totalLimit != null && (
              <>
                <div>
                  <dt>Limite globale</dt>
                  <dd>{formatBytes(totalLimit)}</dd>
                </div>
                <div>
                  <dt>Taux d'occupation</dt>
                  <dd>{totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0}%</dd>
                </div>
              </>
            )}
            <div>
              <dt>Disponible</dt>
              <dd>{formatBytes(totalAvailable)}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  )
}