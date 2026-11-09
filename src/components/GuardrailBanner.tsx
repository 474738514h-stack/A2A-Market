import type { GuardrailEvent } from '../engine/types'
import { RULE_LABEL } from './labels'

const ACTION_LABEL: Record<GuardrailEvent['action'], string> = {
  redacted: '已过滤',
  clamped: '已截断',
  blocked: '已拦截',
  stopped: '已停止',
  retry: '重试',
  escalated: '转人工',
}

export function GuardrailBanner({ event }: { event: GuardrailEvent }) {
  return (
    <div
      role="status"
      className="fade-in flex items-start gap-2.5 rounded-2xl border border-warning bg-warning-soft px-3.5 py-2.5 text-aux text-warning-ink"
    >
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 fill-warning" aria-hidden>
        <path d="M10 2 1 18h18L10 2Zm-1 6h2v5H9V8Zm0 6h2v2H9v-2Z" />
      </svg>
      <div className="min-w-0">
        <div className="font-bold">
          护栏 {event.ruleId} · {RULE_LABEL[event.ruleId] ?? '规则'} · {ACTION_LABEL[event.action]}
        </div>
        <div className="break-words">{event.detail}</div>
      </div>
    </div>
  )
}
