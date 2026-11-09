import type { DealDraft } from '../engine/types'
import { DemoBadge } from './DemoBadge'
import { Badge } from './ui/Badge'
import { Card, CardHeader } from './ui/Card'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-aux text-muted">{label}</dt>
      <dd className={`min-w-0 text-right ${strong ? 'text-[24px] font-extrabold text-primary tabular-nums' : 'font-semibold text-ink'}`}>{value}</dd>
    </div>
  )
}

export function DealDraftCard({ draft, sessionId, confirmed }: { draft: DealDraft; sessionId: string | null; confirmed: boolean }) {
  const saved = Math.round((draft.listPrice - draft.price) * 100) / 100
  return (
    <Card className="rise-in">
      <CardHeader
        title="交易草案"
        extra={<Badge tone={confirmed ? 'success' : 'primary'}>{confirmed ? '已确认' : '待你确认'}</Badge>}
        hint={
          <>
            由 <code className="font-mono text-ink">confirm_deal</code> 生成 · 会话 {sessionId ?? '—'}
          </>
        }
      />
      <dl className="divide-y divide-line">
        <Row label="书" value={`《${draft.bookTitle}》`} />
        <Row label="卖家" value={`${draft.sellerName}（${draft.sellerId}）`} />
        <Row label="品相" value={draft.condition} />
        <Row label="成交价" value={`¥${draft.price}`} strong />
        <Row label="挂牌价 / 你的预算" value={`${draft.listPrice} 元 / ${draft.budget} 元`} />
        <Row label="比挂牌价省" value={`${saved} 元`} />
        <Row label="谈判轮次" value={`第 ${draft.round} 轮成交`} />
        <Row label="履约方式" value={draft.fulfillment} />
      </dl>
      <div className="mt-3">
        <DemoBadge />
      </div>
    </Card>
  )
}
