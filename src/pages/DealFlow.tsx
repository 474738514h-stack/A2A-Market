import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { DealDraftCard } from '../components/DealDraftCard'
import { EscrowStepper } from '../components/EscrowStepper'
import { OUTCOME_COPY } from '../components/labels'
import { ManualReviewButton } from '../components/ManualReviewButton'
import { SuccessCheck } from '../components/SuccessCheck'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { escrowDone } from '../engine/escrow'
import { useSession } from '../store/sessionStore'

const NEXT_ACTION = ['确认交易，货款进入托管', '模拟卖家发货', '我已收到书，确认收货', '确认放款给卖家']

export default function DealFlow() {
  const navigate = useNavigate()
  const { session, sessionId, status, dealConfirmed, escrow, confirmDeal, advanceEscrow, reset } = useSession()
  const outcome = session?.outcome
  const draft = session?.dealDraft
  const finished = escrowDone(escrow)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (finished) window.scrollTo({ top: 0, behavior: 'smooth' })
    else if (escrow.completed > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [escrow.completed, finished])

  const startOver = () => {
    reset()
    navigate('/')
  }

  let body: ReactNode
  let action: ReactNode = null

  if (!session || status === 'idle' || status === 'error') {
    body = (
      <Card className="rise-in text-center">
        <h2 className="text-subtitle">还没有交易草案</h2>
        <p className="mt-1 text-body text-muted">先去说说你想要哪本书，谈成后草案会出现在这里。</p>
      </Card>
    )
    action = (
      <Button size="lg" onClick={() => navigate('/')}>
        去找书
      </Button>
    )
  } else if (status === 'running') {
    body = (
      <Card className="rise-in text-center">
        <h2 className="text-subtitle">还在谈呢</h2>
        <p className="mt-1 text-body text-muted">买卖双方 Agent 正在协商，等结果出来再来确认交易。</p>
      </Card>
    )
    action = (
      <Button size="lg" onClick={() => navigate('/')}>
        回去看协商进度
      </Button>
    )
  } else if (!draft || outcome?.status !== 'deal') {
    const copy = OUTCOME_COPY[outcome!.status]
    body = (
      <Card tone="warning" className="rise-in">
        <h2 className="text-subtitle">{copy.title}</h2>
        <p className="mt-1 text-body text-ink">原因：{outcome!.detail}</p>
        <p className="mt-1 text-aux text-muted">没有谈成，所以不会生成交易草案，也不会进入托管。</p>
        <div className="mt-4">
          <ManualReviewButton reason={outcome!.detail} />
        </div>
      </Card>
    )
    action = (
      <Button size="lg" variant="soft" onClick={startOver}>
        换个需求再试
      </Button>
    )
  } else {
    body = (
      <>
        {finished && (
          <Card tone="success" className="rise-in flex flex-col items-center text-center">
            <SuccessCheck />
            <h2 className="mt-3 text-subtitle">交易完成 ✅</h2>
            <p className="mt-1 text-body text-muted">
              《{draft.bookTitle}》已到你手上，{draft.price} 元已放款给 {draft.sellerName}。
            </p>
          </Card>
        )}
        <DealDraftCard draft={draft} sessionId={sessionId} confirmed={dealConfirmed} />
        {dealConfirmed && <EscrowStepper escrow={escrow} />}
        {!dealConfirmed && (
          <p className="px-1 text-aux text-muted">确认后进入模拟托管：钱先放在平台，你确认收货后才会放给卖家。</p>
        )}
      </>
    )
    action = finished ? (
      <Button size="lg" onClick={startOver}>
        再淘一本
      </Button>
    ) : (
      <Button size="lg" onClick={dealConfirmed ? advanceEscrow : confirmDeal}>
        {NEXT_ACTION[dealConfirmed ? escrow.completed : 0]}
      </Button>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 px-5 pb-6 pt-6">
        <section>
          <h1 className="text-title">🤝 交易确认与托管</h1>
          <p className="mt-2 text-body text-muted">核对一下草案，确认后按步骤走完托管流程。</p>
        </section>
        {body}
        <div ref={bottomRef} />
      </div>
      {action && (
        <div className="sticky bottom-0 z-20 px-5 pt-3 safe-bottom" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--bg) 40%)' }}>
          {action}
        </div>
      )}
    </div>
  )
}
