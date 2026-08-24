/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Écran de chargement global
 * ---------------------------------------------------------------------------
 * Indicateur plein écran (mobile first) affiché pendant la restauration
 * de session ou les opérations bloquantes. Aucun design avancé : socle
 * accessible uniquement (role="status", aria-busy).
 */

/**
 * Écran de chargement accessible.
 * @param {{label?: string}} props - Libellé optionnel pour lecteurs d'écran.
 * @returns {import('react').JSX.Element}
 */
export default function LoadingScreen({ label = 'Chargement en cours…' }) {
  return (
    <div className="loading-screen" role="status" aria-busy="true" aria-live="polite">
      <span className="loading-screen__spinner" aria-hidden="true" />
      <span className="loading-screen__label">{label}</span>
    </div>
  )
}
