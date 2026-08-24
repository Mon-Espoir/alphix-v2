/**
 * ALPHIX V2 — Button
 * Variants: primary, secondary, danger, ghost, outline
 * Sizes: sm, md, lg
 */

/**
 * @param {object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'|'outline'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.loading=false]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  className = '',
  ...rest
}) {
  const cls = [
    'ax-btn',
    `ax-btn--${variant}`,
    `ax-btn--${size}`,
    loading && 'ax-btn--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="ax-btn__spinner" aria-hidden="true" />}
      <span className={loading ? 'ax-btn__content--hidden' : ''}>{children}</span>
    </button>
  )
}
