/**
 * ALPHIX V2 — Container
 */

export default function Container({ children, className = '', size = 'md', ...rest }) {
  const cls = ['ax-container', `ax-container--${size}`, className].filter(Boolean).join(' ')
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}
