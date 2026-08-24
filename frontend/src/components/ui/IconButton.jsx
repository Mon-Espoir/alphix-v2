/**
 * ALPHIX V2 — IconButton
 */

export default function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  badge,
  className = '',
  ...rest
}) {
  const cls = [
    'ax-icon-btn',
    `ax-icon-btn--${variant}`,
    `ax-icon-btn--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={cls} aria-label={label} {...rest}>
      <span className="ax-icon-btn__icon">{icon}</span>
      {badge != null && <span className="ax-icon-btn__badge">{badge}</span>}
    </button>
  )
}
