import { useSession } from '../store/sessionStore'

export function ManualReviewButton({ reason }: { reason: string }) {
  const requested = useSession((s) => s.manualReview.requested)
  const request = useSession((s) => s.requestManualReview)

  if (requested) {
    return (
      <div className="fade-in rounded-card border border-line bg-bg px-4 py-3 text-aux text-ink" role="status">
        <div className="font-bold">已转人工确认（模拟）</div>
        <div className="mt-0.5 text-muted">原因：{reason}。演示环境不会真的联系客服，你可以换个需求继续体验。</div>
      </div>
    )
  }
  return (
    <button type="button" onClick={request} className="press h-12 rounded-card bg-primary text-body font-bold text-white">
      转人工确认
    </button>
  )
}
