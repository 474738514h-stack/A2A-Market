export function SuccessCheck() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" style={{ animation: 'pop 320ms var(--ease) both' }} aria-hidden>
      <circle cx="32" cy="32" r="30" style={{ fill: 'var(--success)' }} />
      <path
        d="M19 33.5 28 42l17-19"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="48"
        style={{ animation: 'check-draw 360ms var(--ease) 120ms both' }}
      />
    </svg>
  )
}
