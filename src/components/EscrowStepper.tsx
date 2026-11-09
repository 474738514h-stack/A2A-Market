import { ESCROW_STEPS, type EscrowState } from '../engine/escrow'
import { Card, CardHeader } from './ui/Card'

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function EscrowStepper({ escrow }: { escrow: EscrowState }) {
  return (
    <Card className="rise-in">
      <CardHeader title="模拟第三方托管" hint="资金托管 → 卖家发货 → 确认收货 → 放款，全程不产生真实支付。" />
      <ol className="relative">
        {ESCROW_STEPS.map((step, i) => {
          const done = i < escrow.completed
          const current = i === escrow.completed
          const log = escrow.log[i]
          return (
            <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
              {i < ESCROW_STEPS.length - 1 && (
                <span
                  className={`absolute left-[13px] top-7 h-[calc(100%-24px)] w-0.5 transition-colors duration-200 ease-spring ${done ? 'bg-success' : 'bg-line'}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-aux font-bold transition-colors duration-200 ease-spring ${
                  done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-line text-muted'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className={`font-bold ${done || current ? 'text-ink' : 'text-muted'}`}>
                  {step.label}
                  {current && <span className="ml-2 text-aux font-semibold text-primary-ink">进行中</span>}
                </div>
                <div className="text-aux text-muted">{done ? `${step.hint} · ${formatTime(log.at)}` : step.hint}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
