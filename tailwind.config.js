/** @type {import('tailwindcss').Config} */
// All colors resolve to CSS variables in src/styles/tokens.css (single source of truth).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        primary: 'var(--primary)',
        'primary-soft': 'var(--primary-soft)',
        'primary-ink': 'var(--primary-ink)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        'warning-ink': 'var(--warning-ink)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        line: 'var(--border)',
        surface: 'var(--surface)',
      },
      borderRadius: {
        card: 'var(--radius)',
      },
      fontSize: {
        body: ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
        aux: ['var(--fs-aux)', { lineHeight: '1.6' }],
        title: ['var(--fs-title)', { lineHeight: '1.3', fontWeight: '800' }],
        subtitle: ['var(--fs-subtitle)', { lineHeight: '1.4', fontWeight: '700' }],
      },
      transitionTimingFunction: {
        spring: 'var(--ease)',
      },
      transitionDuration: {
        DEFAULT: 'var(--dur)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
}
