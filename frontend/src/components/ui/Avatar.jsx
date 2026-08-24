/**
 * ALPHIX V2 — Avatar
 * Sizes: sm (32px), md (40px), lg (56px), xl (80px)
 */

export default function Avatar({ src, alt = '', size = 'md', name, className = '' }) {
  const cls = ['ax-avatar', `ax-avatar--${size}`, className].filter(Boolean).join(' ')

  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : ''

  return (
    <div className={cls} aria-label={alt || name || 'Avatar'}>
      {src ? (
        <img src={src} alt={alt || name || ''} className="ax-avatar__img" />
      ) : (
        <span className="ax-avatar__fallback">{initials || '?'}</span>
      )}
    </div>
  )
}
