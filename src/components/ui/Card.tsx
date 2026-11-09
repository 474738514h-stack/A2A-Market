import type { HTMLAttributes, ReactNode } from 'react'

type Tone = 'warm' | 'plain' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  warm: 'bg-surface',
  plain: 'bg-bg',
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  danger: 'bg-danger-soft',
}

export function Card({
  tone = 'warm',
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return <div className={`rounded-card border border-line shadow-card p-5 ${tones[tone]} ${className}`} {...rest} />
}

export function CardHeader({
  step,
  title,
  extra,
  hint,
}: {
  step?: string
  title: ReactNode
  extra?: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {step && (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-aux font-bold text-white">
              {step}
            </span>
          )}
          <h2 className="text-subtitle truncate">{title}</h2>
        </div>
        {extra}
      </div>
      {hint && <p className="mt-1 text-aux text-muted">{hint}</p>}
    </div>
  )
}
