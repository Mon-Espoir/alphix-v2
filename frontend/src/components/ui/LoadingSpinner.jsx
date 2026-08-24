/**
 * ALPHIX V2 — LoadingSpinner
 */

export default function LoadingSpinner({ size = 'md', label = 'Chargement...', className = '' }) {
  return (
    <div className={['ax-spinner-wrap', className].filter(Boolean).join(' ')} role="status" aria-label={label}>
      <div className={`ax-spinner ax-spinner--${size}`} aria-hidden="true" />
      {label && <span className="ax-spinner-wrap__label">{label}</span>}
    </div>
  )
}
