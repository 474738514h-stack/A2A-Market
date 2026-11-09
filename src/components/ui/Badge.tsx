import type { ReactNode } from 'react'

type Tone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'outline'

const tones: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-ink',
  neutral: 'bg-line text-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger',
  outline: 'border border-line bg-bg text-muted',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
  title,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-aux font-semibold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
