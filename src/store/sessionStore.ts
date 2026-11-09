import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { engineContext } from '../data/loader'
import { advanceEscrow, initialEscrow, type EscrowState } from '../engine/escrow'
import { runSession } from '../engine/negotiationEngine'
import type { SessionResult } from '../engine/types'
import { buildBeats } from './beats'

export type RunStatus = 'idle' | 'running' | 'done' | 'error'

interface SessionStore {
  input: string
  status: RunStatus
  error: string | null
  session: SessionResult | null
  sessionId: string | null
  /** How many timeline beats are visible (drives the step-by-step reveal). */
  revealed: number
  dealConfirmed: boolean
  escrow: EscrowState
  manualReview: { requested: boolean; at: number | null }

  setInput: (text: string) => void
  start: () => void
  reveal: (n: number) => void
  revealAll: () => void
  reset: () => void
  confirmDeal: () => void
  advanceEscrow: () => void
  requestManualReview: () => void
}

export function beatCount(s: SessionResult | null): number {
  return buildBeats(s).length
}

const fresh = {
  status: 'idle' as RunStatus,
  error: null,
  session: null,
  sessionId: null,
  revealed: 0,
  dealConfirmed: false,
  escrow: initialEscrow,
  manualReview: { requested: false, at: null },
}

export const useSession = create<SessionStore>()(
  persist(
    (set, get) => ({
      input: '',
      ...fresh,
      setInput: (text) => set({ input: text }),
      start: () => {
        const text = get().input.trim()
        if (!text) return
        try {
          const session = runSession(text, engineContext)
          set({ ...fresh, status: 'running', session, sessionId: `S-${Date.now().toString(36).toUpperCase()}`, revealed: 1 })
        } catch (e) {
          set({ ...fresh, status: 'error', error: e instanceof Error ? e.message : String(e) })
        }
      },
      reveal: (n) => {
        const total = beatCount(get().session)
        const next = Math.min(n, total)
        set({ revealed: next, status: next >= total ? 'done' : 'running' })
      },
      revealAll: () => set({ revealed: beatCount(get().session), status: 'done' }),
      reset: () => set({ ...fresh }),
      confirmDeal: () => set({ dealConfirmed: true, escrow: advanceEscrow(initialEscrow, Date.now()) }),
      advanceEscrow: () => set({ escrow: advanceEscrow(get().escrow, Date.now()) }),
      requestManualReview: () => set({ manualReview: { requested: true, at: Date.now() } }),
    }),
    {
      name: 'a2a-book-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        input: s.input,
        session: s.session,
        sessionId: s.sessionId,
        status: s.status === 'running' ? 'done' : s.status,
        revealed: s.status === 'running' ? beatCount(s.session) : s.revealed,
        dealConfirmed: s.dealConfirmed,
        escrow: s.escrow,
        manualReview: s.manualReview,
      }),
    },
  ),
)
