import type { SessionResult } from '../engine/types'
import { OUTCOME_COPY } from './labels'
import { ManualReviewButton } from './ManualReviewButton'
import { Card } from './ui/Card'

export function OutcomeCard({ session, onViewDeal, onRetry }: { session: SessionResult; onViewDeal: () => void; onRetry: () => void }) {
  const outcome = session.outcome!
  const copy = OUTCOME_COPY[outcome.status]
  const isDeal = outcome.status === 'deal'

  return (
    <Card tone={isDeal ? 'success' : 'warning'} className="rise-in">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${isDeal ? 'bg-success' : 'bg-warning'}`}
          aria-hidden
        >
          {isDeal ? '✓' : '!'}
        </span>
        <div className="min-w-0">
          <h3 className="text-subtitle">{copy.title}</h3>
          <p className="mt-1 text-body text-ink">{outcome.detail}</p>
          <p className="mt-1 text-aux text-muted">{copy.body}</p>
          <p className="mt-2 text-aux text-muted">
            结局 <code className="font-mono">{outcome.status}</code> · 共 {session.stats.rounds} 轮 · 消息 {session.stats.messageValid}/
            {session.stats.messageAttempts} 通过校验
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {isDeal ? (
          <button
            type="button"
            onClick={onViewDeal}
            className="press h-12 rounded-2xl bg-success text-body font-bold text-white"
          >
            查看交易草案
          </button>
        ) : (
          <>
            <ManualReviewButton reason={outcome.detail} />
            <button type="button" onClick={onRetry} className="press h-11 rounded-2xl bg-bg text-body font-semibold text-ink border border-line">
              换个需求再试
            </button>
          </>
        )}
      </div>
    </Card>
  )
}
