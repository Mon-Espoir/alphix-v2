/**
 * ALPHIX V2 — DocumentStatistics
 * Widget de statistiques temps reel : vues, telechargements, popularite.
 */

import StatCard from '../ui/StatCard'

/**
 * @param {object} props
 * @param {number|string|null} [props.viewsCount] - Compteur de vues.
 * @param {number|string|null} [props.downloadsCount] - Compteur de telechargements.
 * @param {boolean} [props.isFeatured] - Mise en avant editoriale.
 * @returns {import('react').JSX.Element}
 */
export default function DocumentStatistics({ viewsCount, downloadsCount, isFeatured }) {
  return (
    <div className="ax-dashboard-grid">
      <StatCard
        icon={<span role="img" aria-label="Vues">👁</span>}
        label="Vues"
        value={String(viewsCount ?? 0)}
      />
      <StatCard
        icon={<span role="img" aria-label="Telechargements">⬇</span>}
        label="Telechargements"
        value={String(downloadsCount ?? 0)}
      />
      <StatCard
        icon={<span role="img" aria-label="Mise en avant">{isFeatured ? '⭐' : '☆'}</span>}
        label="A la une"
        value={isFeatured ? 'Oui' : 'Non'}
      />
    </div>
  )
}