import casesRaw from '../../eval/cases.jsonl?raw'

// Mirrors METRIC_DEFS / METRIC_DEF_VERSION in eval/run_eval.py.
export const METRIC_DEF_VERSION = 'metrics-v1.0.0'

export const METRIC_DEFS: Array<{ key: string; label: string; definition: string; target: string; unit: string }> = [
  { key: 'negotiation_success_rate', label: '协商成功率', definition: '成交会话数 ÷ 进入议价（已匹配卖家）的会话数', target: '≥70%', unit: '%' },
  { key: 'avg_rounds', label: '平均协商轮次', definition: '成交会话 stats.rounds 的平均值', target: '≤5 轮', unit: '轮' },
  { key: 'budget_deviation', label: '成交价与预算偏差', definition: '成交会话 |成交价 − 预算| ÷ 预算 的平均值', target: '≤10%', unit: '%' },
  { key: 'guardrail_trigger_rate', label: '护栏触发率', definition: '至少触发 1 次护栏事件的会话数 ÷ 全部会话数', target: '≤15%', unit: '%' },
  { key: 'parse_success_rate', label: '结构化输出解析成功率', definition: '通过 message.schema.json 校验的消息数 ÷ 生成的消息总数（含重试）', target: '≥95%', unit: '%' },
]

export const TARGET_STATUS = '[待验证]'

const lines = casesRaw.split('\n').filter((l) => l.trim())
const versions = new Set<string>()
for (const l of lines) {
  try {
    versions.add((JSON.parse(l) as { datasetVersion: string }).datasetVersion)
  } catch {
    versions.add('invalid')
  }
}

export const casesInfo = {
  file: 'eval/cases.jsonl',
  count: lines.length,
  version: [...versions].join(', ') || '—',
}

export const EVAL_COMMAND = 'python3 eval/run_eval.py --cases eval/cases.jsonl'

export interface EvalReport {
  taskId: string
  runNo: number
  runKind: 'initial' | 'rerun'
  runAt: string
  finishedAt: string
  datasetVersion: string
  casesHash: string
  sampleCount: number
  metricDefVersion: string
  engineVersion: string
  promptVersions: { buyer: string; seller: string }
  configSource: Record<string, string>
  benchmark: { status: 'passed' | 'skipped' | 'failed'; cases: number; failed?: number }
  metrics: Record<string, { label: string; unit: string; target: string; value: number | null; targetStatus: string; definition: string }>
  casePassRate: { passed: number; total: number; value: number | null }
  outcomeBreakdown: Record<string, number>
  comparison:
    | { status: 'baseline_established'; key: string; note: string }
    | { status: 'compared'; key: string; baseline: { taskId: string; runNo: number; establishedAt: string }; deltas: Record<string, number | null> }
  failures: { open: number; fixed_pending_rerun: number; fixed: number; file: string }
}

export function isEvalReport(v: unknown): v is EvalReport {
  const r = v as Partial<EvalReport> | null
  return !!r && typeof r.taskId === 'string' && typeof r.runAt === 'string' && typeof r.datasetVersion === 'string' && !!r.metrics
}
