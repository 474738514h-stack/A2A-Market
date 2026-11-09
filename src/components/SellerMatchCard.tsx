import { formatGrade } from '../engine/money'
import type { SessionResult } from '../engine/types'
import { STYLE_LABEL } from './labels'
import { Badge } from './ui/Badge'
import { Card, CardHeader } from './ui/Card'

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-2 text-aux">
      <span className="w-8 shrink-0 text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums text-muted">
        {value}/{max}
      </span>
    </div>
  )
}

export function SellerMatchCard({ session }: { session: SessionResult }) {
  const match = session.match!
  const best = match.scores.find((s) => s.sellerId === match.sellerId)
  const others = match.scores.filter((s) => s.sellerId !== match.sellerId)

  return (
    <Card className="rise-in">
      <CardHeader
        step="2"
        title={best ? `已为你找到 ${best.sellerName}，开始聊聊吧` : '暂时没有合适的卖家'}
        hint={
          <>
            <code className="font-mono text-ink">broadcast_demand</code> 触达 {session.candidates.length} 位卖家 Agent →{' '}
            <code className="font-mono text-ink">match_seller</code> 按品相 / 价格 / 信誉打分
          </>
        }
      />
      {best && (
        <div className="rounded-card border border-primary bg-bg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-bold">{best.sellerName}</span>
                <Badge tone="primary">命中</Badge>
              </div>
              <div className="mt-0.5 text-aux text-muted">
                {best.sellerId} · {formatGrade(best.grade)} · {best.hasNotes ? '有笔记' : '无笔记'} · 话术{STYLE_LABEL[best.style] ?? best.style}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[24px] font-extrabold leading-none text-primary tabular-nums">{best.total}</div>
              <div className="text-aux text-muted">匹配分</div>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between text-aux">
            <span className="text-muted">挂牌价</span>
            <span className="font-semibold text-ink">{best.listPrice} 元</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <ScoreBar label="品相" value={best.conditionFit} max={40} />
            <ScoreBar label="价格" value={best.priceFit} max={35} />
            <ScoreBar label="信誉" value={best.reputationFit} max={25} />
          </div>
          <p className="mt-2 text-aux text-muted">卖家底价仅卖家 Agent 可见，不会展示给你。</p>
        </div>
      )}
      {others.length > 0 && (
        <ul className="mt-3 space-y-2">
          {others.map((s) => (
            <li key={s.sellerId} className="flex items-center justify-between gap-3 rounded-card bg-bg px-4 py-2.5 border border-line">
              <div className="min-w-0">
                <div className="truncate text-aux font-semibold text-ink">
                  {s.sellerName} <span className="font-normal text-muted">· {s.listPrice} 元</span>
                </div>
                <div className="truncate text-aux text-muted">{s.rejectReason ?? `${formatGrade(s.grade)} · 信誉 ${s.reputation}`}</div>
              </div>
              {s.eligible ? (
                <span className="text-aux font-bold tabular-nums text-muted">{s.total} 分</span>
              ) : (
                <Badge tone="neutral">未入选</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
