/**
 * ALPHIX V2 — PageTitle
 */

export default function PageTitle({ title, subtitle, actions, className = '' }) {
  return (
    <div className={['ax-page-title', className].filter(Boolean).join(' ')}>
      <div className="ax-page-title__text">
        <h1 className="ax-page-title__heading">{title}</h1>
        {subtitle && <p className="ax-page-title__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ax-page-title__actions">{actions}</div>}
    </div>
  )
}
