/**
 * ALPHIX V2 — Card
 */

export default function Card({ children, className = '', padding = true, ...rest }) {
  const cls = ['ax-card', padding && 'ax-card--padded', className].filter(Boolean).join(' ')
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={['ax-card__header', className].filter(Boolean).join(' ')}>{children}</div>
}

export function CardBody({ children, className = '' }) {
  return <div className={['ax-card__body', className].filter(Boolean).join(' ')}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return <div className={['ax-card__footer', className].filter(Boolean).join(' ')}>{children}</div>
}
