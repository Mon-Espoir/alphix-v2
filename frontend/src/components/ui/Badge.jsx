/**
 * ALPHIX V2 — Badge
 */

export default function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const cls = [
    'ax-badge',
    `ax-badge--${variant}`,
    `ax-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={cls}>{children}</span>
}
