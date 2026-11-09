import type { SessionResult } from '../engine/types'
import type { Beat } from '../store/beats'
import { GuardrailBanner } from './GuardrailBanner'
import { InquiryBubbles, MessageBubble } from './MessageBubble'
import { Card, CardHeader } from './ui/Card'

export function NegotiationTimeline({ session, beats, running }: { session: SessionResult; beats: Beat[]; running: boolean }) {
  const sellerName = session.match?.scores.find((s) => s.sellerId === session.match?.sellerId)?.sellerName ?? '卖家'
  const showInquiry = beats.some((b) => b.kind === 'inquiry')
  const firstOfRound = new Set<number>()
  const seenRounds = new Set<number>()
  for (const b of beats) {
    if (b.kind === 'message' && !seenRounds.has(b.message.round)) {
      seenRounds.add(b.message.round)
      firstOfRound.add(b.message.seq)
    }
  }

  return (
    <Card className="rise-in">
      <CardHeader
        step="3"
        title="协商时间线"
        hint="买卖双方 Agent 按 message.schema.json 交换结构化消息，最多 6 轮；黄色提示条是护栏动作。"
      />
      <div className="space-y-3">
        {showInquiry && session.inquiry && (
          <>
            <RoundDivider label="品相确认" />
            <InquiryBubbles
              question={session.inquiry.question}
              reply={session.inquiry.answer.reply}
              sellerName={sellerName}
              satisfied={session.inquiry.satisfied}
              promptVersions={session.promptVersions}
            />
          </>
        )}
        {beats.map((b) => {
          if (b.kind === 'message') {
            const divider = firstOfRound.has(b.message.seq) ? <RoundDivider label={`第 ${b.message.round} 轮`} /> : null
            return (
              <div key={`m${b.message.seq}`} className="space-y-3">
                {divider}
                <MessageBubble message={b.message} sellerName={sellerName} />
              </div>
            )
          }
          if (b.kind === 'guardrail') return <GuardrailBanner key={`g${b.event.seq}`} event={b.event} />
          return null
        })}
        {running && (
          <div className="flex items-center gap-2 px-1 text-aux text-muted" aria-live="polite">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Agent 正在思考下一步…
          </div>
        )}
      </div>
    </Card>
  )
}

function RoundDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-aux font-semibold text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
