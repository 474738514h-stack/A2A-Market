import type { ReactNode } from 'react'
import type { Intent, MessageRecord } from '../engine/types'
import { INTENT_META } from './labels'
import { Badge } from './ui/Badge'

function Frame({
  side,
  who,
  tone,
  children,
  footer,
}: {
  side: 'left' | 'right'
  who: string
  tone: 'buyer' | 'seller' | 'invalid' | 'blocked'
  children: ReactNode
  footer: ReactNode
}) {
  const toneClass = {
    buyer: 'bg-primary-soft border-line',
    seller: 'bg-bg border-line',
    invalid: 'bg-danger-soft border-danger border-dashed',
    blocked: 'bg-warning-soft border-warning border-dashed',
  }[tone]
  return (
    <div className={`fade-in flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-[86%] max-w-[360px] ${side === 'right' ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className="mb-1 px-1 text-aux text-muted">{who}</span>
        <div
          className={`w-full rounded-card border px-4 py-3 shadow-card ${toneClass} ${
            side === 'right' ? 'rounded-tr-md' : 'rounded-tl-md'
          }`}
        >
          {children}
          <div className="mt-2 border-t border-line pt-2 text-aux text-muted">{footer}</div>
        </div>
      </div>
    </div>
  )
}

function SourceLine({ tool, source }: { tool: string; source: { prompt: string; ruleId: string } }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <code className="font-mono text-ink">{tool}</code>
      <span>·</span>
      <span>
        来源 {source.prompt} / {source.ruleId}
      </span>
    </div>
  )
}

export function MessageBubble({ message, sellerName }: { message: MessageRecord; sellerName: string }) {
  const isBuyer = message.actor === 'buyer'
  const side = isBuyer ? 'right' : 'left'
  const who = isBuyer ? '你的买家 Agent' : `${sellerName} 的卖家 Agent`

  if (message.status === 'invalid') {
    return (
      <Frame
        side={side}
        who={`${who} · 第 ${message.attempt} 次输出`}
        tone="invalid"
        footer={<SourceLine tool={message.tool} source={message.source} />}
      >
        <div className="flex items-center gap-2">
          <Badge tone="danger">parse_error</Badge>
          <span className="text-aux font-semibold text-danger">未通过 message.schema.json 校验</span>
        </div>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-card bg-bg p-2 font-mono text-[12px] leading-5 text-ink">
          {JSON.stringify(message.payload, null, 0)}
        </pre>
        <ul className="mt-2 list-disc pl-5 text-aux text-danger">
          {message.errors.map((e) => (
            <li key={e} className="font-mono">
              {e}
            </li>
          ))}
        </ul>
      </Frame>
    )
  }

  const p = message.payload as { intent: Intent; price: number; condition: string; notes: string; reason: string }
  const meta = INTENT_META[p.intent]
  const blocked = message.status === 'blocked'

  return (
    <Frame
      side={side}
      who={who}
      tone={blocked ? 'blocked' : isBuyer ? 'buyer' : 'seller'}
      footer={<SourceLine tool={message.tool} source={message.source} />}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {blocked && <Badge tone="warning">护栏拦截，未发送</Badge>}
      </div>
      <div className={`mt-1.5 text-[24px] font-extrabold tabular-nums leading-tight ${blocked ? 'text-muted line-through' : 'text-ink'}`}>
        ¥{p.price}
      </div>
      <p className="mt-1 text-body text-ink">{p.reason}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="outline">{isBuyer ? `要求 ${p.condition}` : `品相 ${p.condition}`}</Badge>
        {p.notes && <Badge tone="outline">备注：{p.notes}</Badge>}
      </div>
    </Frame>
  )
}

export function InquiryBubbles({
  question,
  reply,
  sellerName,
  satisfied,
  promptVersions,
}: {
  question: string
  reply: string
  sellerName: string
  satisfied: boolean
  promptVersions: { buyer: string; seller: string }
}) {
  return (
    <div className="space-y-3">
      <Frame
        side="right"
        who="你的买家 Agent"
        tone="buyer"
        footer={<SourceLine tool="ask_condition" source={{ prompt: `buyer@${promptVersions.buyer}`, ruleId: 'B-COND-05' }} />}
      >
        <Badge tone="primary">询问品相</Badge>
        <p className="mt-1.5 text-body">{question}</p>
      </Frame>
      <Frame
        side="left"
        who={`${sellerName} 的卖家 Agent`}
        tone="seller"
        footer={<SourceLine tool="ask_condition" source={{ prompt: `seller@${promptVersions.seller}`, ruleId: 'S-DISCLOSE-04' }} />}
      >
        <Badge tone={satisfied ? 'success' : 'danger'}>{satisfied ? '品相符合' : '品相不符'}</Badge>
        <p className="mt-1.5 text-body">{reply}</p>
      </Frame>
    </div>
  )
}
