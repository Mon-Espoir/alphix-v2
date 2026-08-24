/**
 * ALPHIX V2 — PageHeader
 * En-tete de page reutilisable avec titre, sous-titre et actions.
 */

export default function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={['ax-page-header', className].filter(Boolean).join(' ')}>
      <div className="ax-page-header__text">
        <h1 className="ax-page-header__title">{title}</h1>
        {subtitle && <p className="ax-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ax-page-header__actions">{actions}</div>}
    </div>
  )
}
