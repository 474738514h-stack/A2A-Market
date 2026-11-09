import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { DemoBadge } from './components/DemoBadge'

const tabs = [
  { to: '/', label: '找书议价', end: true },
  { to: '/deal', label: '交易托管', end: false },
  { to: '/eval', label: '评测说明', end: false },
]

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="page-glow min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[var(--page-max)] flex-col">
        <header className="px-5 pt-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-aux font-bold tracking-wide text-primary-ink">A2A 二手书协商代理</span>
            <DemoBadge compact />
          </div>
          <nav className="mt-4 grid grid-cols-3 gap-1 rounded-card bg-bg p-1 border border-line" aria-label="主导航">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `press rounded-card py-1.5 text-center text-aux font-semibold ${
                    isActive ? 'bg-primary text-white' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
