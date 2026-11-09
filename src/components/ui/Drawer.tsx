import { useEffect, type ReactNode } from 'react'

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-200 ease-spring ${open ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: 'rgba(31,41,55,0.32)' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[var(--page-max)] flex-col rounded-t-card bg-bg shadow-card transition-transform duration-[240ms] ease-spring ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="text-subtitle">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="press h-9 w-9 rounded-full bg-line text-muted"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 safe-bottom">{children}</div>
      </div>
    </div>
  )
}
