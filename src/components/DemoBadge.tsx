export const DEMO_NOTICE = '演示数据 · 脚本模拟，不调用真实大模型'

export function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-0.5 text-aux font-semibold text-muted whitespace-nowrap"
      title={DEMO_NOTICE}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {compact ? '演示数据 · 脚本模拟' : DEMO_NOTICE}
    </span>
  )
}
