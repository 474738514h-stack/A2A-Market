import { useEffect, useState } from 'react'
import { DemoBadge } from '../components/DemoBadge'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EVAL_COMMAND, METRIC_DEFS, METRIC_DEF_VERSION, TARGET_STATUS, casesInfo, isEvalReport, type EvalReport } from '../data/evalMeta'

type LoadState = { kind: 'loading' } | { kind: 'missing' } | { kind: 'invalid'; message: string } | { kind: 'ready'; report: EvalReport }

function formatTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toLocaleString('zh-CN', { hour12: false })}（原始 ${iso}）`
}

function CopyCommand() {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-card bg-bg p-2 pl-4 border border-line">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-ink">{EVAL_COMMAND}</code>
      <Button
        size="sm"
        variant="soft"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(EVAL_COMMAND)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
          } catch {
            setCopied(false)
          }
        }}
      >
        {copied ? '已复制' : '复制'}
      </Button>
    </div>
  )
}

function formatValue(value: number | null, unit: string) {
  if (value === null) return '—'
  return unit === '轮' ? `${value} 轮` : `${value}${unit}`
}

function ReportView({ report }: { report: EvalReport }) {
  const cmp = report.comparison
  return (
    <Card className="rise-in">
      <CardHeader
        title="本地运行结果"
        extra={<Badge tone={report.benchmark.status === 'passed' ? 'success' : 'warning'}>基准比对 {report.benchmark.status}</Badge>}
        hint="读取自 eval/latest_report.json，由你在本地运行脚本生成；这里只读展示。"
      />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-aux">
        <div className="col-span-2">
          <dt className="text-muted">运行时间</dt>
          <dd className="font-semibold text-ink break-words">{formatTime(report.finishedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">样本集版本</dt>
          <dd className="font-semibold text-ink">
            {report.datasetVersion} · {report.sampleCount} 条
          </dd>
        </div>
        <div>
          <dt className="text-muted">指标定义</dt>
          <dd className="font-semibold text-ink">{report.metricDefVersion}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted">任务</dt>
          <dd className="font-mono text-ink break-all">
            {report.taskId} · 第 {report.runNo} 次（{report.runKind === 'rerun' ? '复跑' : '首次'}）
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted">样本哈希 / Prompt 版本</dt>
          <dd className="font-mono text-ink break-all">
            {report.casesHash.slice(0, 16)}… · buyer@{report.promptVersions.buyer} · seller@{report.promptVersions.seller}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {METRIC_DEFS.map((d) => {
          const m = report.metrics[d.key]
          return (
            <div key={d.key} className="rounded-card bg-bg p-3 border border-line">
              <div className="text-aux text-muted">{d.label}</div>
              <div className="mt-0.5 text-[22px] font-extrabold tabular-nums text-ink">{formatValue(m?.value ?? null, d.unit)}</div>
              <div className="text-aux text-muted">
                目标 {d.target} <span className="font-semibold text-warning-ink">{m?.targetStatus ?? TARGET_STATUS}</span>
              </div>
            </div>
          )
        })}
        <div className="rounded-card bg-bg p-3 border border-line">
          <div className="text-aux text-muted">样本符合预期</div>
          <div className="mt-0.5 text-[22px] font-extrabold tabular-nums text-ink">
            {report.casePassRate.passed}/{report.casePassRate.total}
          </div>
          <div className="text-aux text-muted">辅助指标</div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-aux">
        <div className="rounded-card bg-primary-soft px-4 py-3 text-primary-ink">
          {cmp.status === 'baseline_established' ? (
            <>
              <b>基线：</b>
              {cmp.note}
            </>
          ) : (
            <>
              <b>
                对比基线 {cmp.baseline.taskId}#run{cmp.baseline.runNo}：
              </b>
              {Object.entries(cmp.deltas)
                .map(([k, v]) => `${report.metrics[k]?.label ?? k} ${v === null ? '—' : v > 0 ? `+${v}` : v}`)
                .join('；')}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="danger">open {report.failures.open}</Badge>
          <Badge tone="warning">fixed_pending_rerun {report.failures.fixed_pending_rerun}</Badge>
          <Badge tone="success">fixed {report.failures.fixed}</Badge>
          <span className="text-muted">详见 {report.failures.file}</span>
        </div>
        <div className="text-muted">
          结局分布：
          {Object.entries(report.outcomeBreakdown)
            .map(([k, v]) => `${k} ${v}`)
            .join(' · ')}
        </div>
      </div>
    </Card>
  )
}

export default function EvalInfo() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let alive = true
    fetch('/__eval/latest_report.json', { cache: 'no-store' })
      .then(async (res): Promise<LoadState> => {
        const text = await res.text()
        let body: { status?: string; report?: unknown; message?: string }
        try {
          body = JSON.parse(text)
        } catch {
          // A static host without the dev middleware answers with index.html.
          return { kind: 'missing' }
        }
        if (body.status === 'ready') {
          return isEvalReport(body.report) ? { kind: 'ready', report: body.report } : { kind: 'invalid', message: '报告格式无法识别' }
        }
        if (body.status === 'invalid') return { kind: 'invalid', message: body.message ?? '报告读取失败' }
        return { kind: 'missing' }
      })
      .catch(() => ({ kind: 'missing' }) as LoadState)
      .then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-4 px-5 pb-10 pt-6">
      <section>
        <h1 className="text-title">离线评测说明</h1>
        <p className="mt-2 text-body text-muted">评测只在本地用 Python 脚本运行，这个页面只负责说明口径、展示你跑出来的报告，不会替你跑，也不会预填结果。</p>
        <div className="mt-3">
          <DemoBadge />
        </div>
      </section>

      <Card>
        <CardHeader title="怎么跑" hint="只用 Python 3.10+ 标准库；脚本先做 TS ↔ Python 基准比对，一致后才评测 30 条样本。" />
        <CopyCommand />
        <ul className="mt-3 space-y-1 text-aux text-muted">
          <li>· 产出 eval/latest_report.json（指标 + 样本集版本 + 运行时间）与 eval/failures.jsonl</li>
          <li>· 删掉 cases.jsonl 时脚本会报错退出，不会静默跳过</li>
          <li>· 复跑：--rerun &lt;taskId&gt;，只用该任务冻结的样本；首个成功运行只建立基线</li>
        </ul>
      </Card>

      {state.kind === 'loading' && (
        <Card className="text-center text-muted" aria-busy="true">
          正在查找本地报告…
        </Card>
      )}
      {state.kind === 'missing' && (
        <Card tone="plain" className="rise-in text-center">
          <Badge tone="neutral">待运行</Badge>
          <h2 className="mt-2 text-subtitle">还没有评测报告</h2>
          <p className="mt-1 text-body text-muted">在项目根目录运行上面的命令后刷新本页，就能看到运行时间、样本版本和各项指标。</p>
        </Card>
      )}
      {state.kind === 'invalid' && (
        <Card tone="danger" className="rise-in">
          <h2 className="text-subtitle">报告读取失败</h2>
          <p className="mt-1 text-body text-muted">{state.message}。可以重新运行脚本生成 eval/latest_report.json。</p>
        </Card>
      )}
      {state.kind === 'ready' && <ReportView report={state.report} />}

      <Card>
        <CardHeader title="评测口径" hint={`样本集 ${casesInfo.version} · ${casesInfo.count} 条（${casesInfo.file}）· 指标定义 ${METRIC_DEF_VERSION}`} />
        <ul className="divide-y divide-line">
          {METRIC_DEFS.map((d) => (
            <li key={d.key} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-bold text-ink">{d.label}</span>
                <span className="shrink-0 text-aux text-muted">
                  目标 {d.target} <span className="font-semibold text-warning-ink">{TARGET_STATUS}</span>
                </span>
              </div>
              <p className="text-aux text-muted">{d.definition}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-aux text-muted">目标值需要你本地实跑后确认，页面和文档一律标注 {TARGET_STATUS}，不会自动判定为已达成。</p>
      </Card>

      <Card>
        <CardHeader title="历史比较规则" />
        <ul className="space-y-1 text-aux text-muted">
          <li>· 只与「同样本集版本 + 同样本集合（哈希）+ 同指标定义」的成功基线比较</li>
          <li>· 首个成功运行只建立基线，不计算差异；不按运行次数或预置历史算差异</li>
          <li>· 运行失败或取消不会写报告，也不会借用旧的失败列表</li>
          <li>· 失败样本只有复跑通过才会标记为 fixed</li>
        </ul>
      </Card>
    </div>
  )
}
