/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Section Administration
 * ---------------------------------------------------------------------------
 * Enveloppe Card avec titre / description. Réutilisable sans dupliquer.
 */

import Card from '../ui/Card'

export default function AdminSection({ title, description, actions, children, className = '' }) {
  return (
    <Card className={['ax-admin-section', className].filter(Boolean).join(' ')}>
      {(title || description || actions) && (
        <div className="ax-admin-section__header">
          <div className="ax-admin-section__titles">
            {title && <h2 className="ax-admin-section__title">{title}</h2>}
            {description && <p className="ax-admin-section__desc">{description}</p>}
          </div>
          {actions && <div className="ax-admin-section__actions">{actions}</div>}
        </div>
      )}
      <div className="ax-admin-section__body">{children}</div>
    </Card>
  )
}
