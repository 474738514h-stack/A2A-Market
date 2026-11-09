import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemandForm } from '../components/DemandForm'
import { DemoBadge } from '../components/DemoBadge'
import { ManualReviewButton } from '../components/ManualReviewButton'
import { NegotiationTimeline } from '../components/NegotiationTimeline'
import { OutcomeCard } from '../components/OutcomeCard'
import { ParsedRequirementCard } from '../components/ParsedRequirementCard'
import { PromptConfigDrawer } from '../components/PromptConfigDrawer'
import { SellerMatchCard } from '../components/SellerMatchCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { buildBeats, type Beat } from '../store/beats'
import { useSession } from '../store/sessionStore'

const BEAT_DELAY: Record<Beat['kind'], number> = {
  parse: 700,
  match: 900,
  inquiry: 800,
  message: 650,
  guardrail: 450,
  outcome: 500,
}

export default function BuyerWorkbench() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { input, setInput, status, session, revealed, reveal, revealAll, start, reset, error } = useSession()
  const beats = useMemo(() => buildBeats(session), [session])
  const visible = beats.slice(0, revealed)
  const has = (k: Beat['kind']) => visible.some((b) => b.kind === k)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status !== 'running' || revealed >= beats.length) return
    const next = beats[revealed]
    const t = window.setTimeout(() => reveal(revealed + 1), BEAT_DELAY[next.kind])
    return () => window.clearTimeout(t)
  }, [status, revealed, beats, reveal])

  useEffect(() => {
    if (revealed > 1) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [revealed])

  const running = status === 'running'
  const done = status === 'done' && session !== null
  const isDeal = done && session.outcome?.status === 'deal'
  const parseEvents = session?.guardrailEvents.filter((e) => e.round === null) ?? []
  const showTimeline = session !== null && (has('inquiry') || has('message'))

  const restart = () => {
    reset()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 px-5 pb-6 pt-6">
        <section>
          <h1 className="text-title">📚 帮你淘一本好书</h1>
          <p className="mt-2 text-body text-muted">告诉我你想要的书、品相和预算，买家 Agent 会替你去和卖家 Agent 谈价，你只需要最后点头。</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DemoBadge />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="press rounded-full border border-line bg-bg px-3 py-0.5 text-aux font-semibold text-primary-ink hover:border-primary"
            >
              查看 Prompt 配置
            </button>
          </div>
        </section>

        <DemandForm value={input} onChange={setInput} disabled={running} />

        {status === 'error' && (
          <Card tone="danger" className="rise-in">
            <h3 className="text-subtitle">出了点意外，自动流程已停止</h3>
            <p className="mt-1 text-aux text-muted break-words">{error}</p>
            <div className="mt-3">
              <ManualReviewButton reason="引擎护栏断言失败" />
            </div>
          </Card>
        )}

        {session && has('parse') && <ParsedRequirementCard session={session} parseEvents={parseEvents} />}
        {session && has('match') && <SellerMatchCard session={session} />}
        {session && showTimeline && <NegotiationTimeline session={session} beats={visible} running={running} />}
        {session && has('outcome') && <OutcomeCard session={session} onViewDeal={() => navigate('/deal')} onRetry={restart} />}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 z-20 px-5 pt-3 safe-bottom" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--bg) 40%)' }}>
        {running ? (
          <Button size="lg" variant="soft" onClick={revealAll}>
            跳过动画，直接看结果
          </Button>
        ) : isDeal ? (
          <Button size="lg" onClick={() => navigate('/deal')}>
            去确认交易
          </Button>
        ) : done || status === 'error' ? (
          <Button size="lg" onClick={start} disabled={!input.trim()}>
            按当前需求重新找书
          </Button>
        ) : (
          <Button size="lg" onClick={start} disabled={!input.trim()}>
            开始找书
          </Button>
        )}
      </div>

      <PromptConfigDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
