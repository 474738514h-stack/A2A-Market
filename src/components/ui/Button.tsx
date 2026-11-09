import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'soft' | 'ghost' | 'danger'
type Size = 'lg' | 'md' | 'sm'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-card hover:brightness-105 disabled:opacity-50',
  soft: 'bg-primary-soft text-primary-ink hover:brightness-[0.98] disabled:opacity-50',
  ghost: 'bg-transparent text-muted hover:bg-primary-soft hover:text-primary-ink disabled:opacity-50',
  danger: 'bg-danger-soft text-danger hover:brightness-[0.98] disabled:opacity-50',
}

const sizes: Record<Size, string> = {
  lg: 'h-14 px-6 text-[16px] font-bold rounded-card w-full',
  md: 'h-11 px-5 text-body font-semibold rounded-2xl',
  sm: 'h-8 px-3 text-aux font-semibold rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={`press inline-flex items-center justify-center gap-2 select-none disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  )
}
