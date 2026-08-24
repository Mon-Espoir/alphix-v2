/**
 * ALPHIX V2 — Section
 */

export default function Section({ children, className = '', title, subtitle, ...rest }) {
  return (
    <section className={['ax-section', className].filter(Boolean).join(' ')} {...rest}>
      {(title || subtitle) && (
        <div className="ax-section__header">
          {title && <h2 className="ax-section__title">{title}</h2>}
          {subtitle && <p className="ax-section__subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
