import type { ReactNode } from 'react'
import { formatGrade } from '../engine/money'
import type { GuardrailEvent, SessionResult } from '../engine/types'
import { GuardrailBanner } from './GuardrailBanner'
import { Badge } from './ui/Badge'
import { Card, CardHeader } from './ui/Card'

const FIELD_LABEL = { title: '书名', condition: '品相', notes: '笔记', budget: '预算' } as const
type Field = keyof typeof FIELD_LABEL

function highlight(text: string, matched: Record<Field, string | null>): ReactNode[] {
  const spans: Array<{ start: number; end: number; field: Field }> = []
  for (const field of Object.keys(matched) as Field[]) {
    const m = matched[field]
    if (!m) continue
    const start = text.indexOf(m)
    if (start >= 0) spans.push({ start, end: start + m.length, field })
  }
  spans.sort((a, b) => a.start - b.start)
  const out: ReactNode[] = []
  let cursor = 0
  for (const s of spans) {
    if (s.start < cursor) continue
    if (s.start > cursor) out.push(text.slice(cursor, s.start))
    out.push(
      <mark key={s.start} title={FIELD_LABEL[s.field]} className="rounded-md bg-primary-soft px-0.5 font-semibold text-primary-ink">
        {text.slice(s.start, s.end)}
      </mark>,
    )
    cursor = s.end
  }
  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.9 ? 'bg-success' : value >= 0.7 ? 'bg-primary' : 'bg-warning'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-aux tabular-nums text-muted">{pct}%</span>
    </div>
  )
}

export function ParsedRequirementCard({ session, parseEvents }: { session: SessionResult; parseEvents: GuardrailEvent[] }) {
  const req = session.requirement
  const failed = session.outcome?.status === 'parse_failed'
  const rows: Array<{ field: Field; value: string; missing: boolean }> = req
    ? [
        { field: 'title', value: req.title ? `《${req.title}》` : '未识别', missing: req.title === null },
        { field: 'condition', value: req.conditionMin === null ? '不限（未提及）' : `${formatGrade(req.conditionMin)}及以上`, missing: false },
        { field: 'notes', value: req.noNotes === true ? '不要笔记' : req.noNotes === false ? '有笔记也行' : '未提及', missing: false },
        { field: 'budget', value: req.budget === null ? '未识别' : `${req.budget} 元（硬上限）`, missing: req.budget === null },
      ]
    : []

  return (
    <Card className="rise-in">
      <CardHeader
        step="1"
        title="需求解析"
        extra={<Badge tone="outline">模拟解析</Badge>}
        hint={
          <>
            工具 <code className="font-mono text-ink">parse_requirement</code> · 规则抽取，模拟大模型的结构化输出
          </>
        }
      />
      <p className="rounded-2xl bg-bg px-4 py-3 text-body leading-[1.75] break-words border border-line">
        {req ? highlight(session.input.sanitized, req.matchedText) : session.input.sanitized}
      </p>
      {parseEvents.length > 0 && (
        <div className="mt-3 space-y-2">
          {parseEvents.map((e) => (
            <GuardrailBanner key={e.seq} event={e} />
          ))}
        </div>
      )}
      <dl className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <div key={r.field} className="flex items-center justify-between gap-3 py-2">
            <dt className="w-10 shrink-0 text-aux text-muted">{FIELD_LABEL[r.field]}</dt>
            <dd className={`min-w-0 flex-1 truncate font-semibold ${r.missing ? 'text-danger' : 'text-ink'}`}>{r.value}</dd>
            <Confidence value={req!.confidence[r.field]} />
          </div>
        ))}
      </dl>
      {failed && <p className="mt-2 text-aux text-danger">{session.outcome?.detail}，自动流程已暂停。</p>}
    </Card>
  )
}
