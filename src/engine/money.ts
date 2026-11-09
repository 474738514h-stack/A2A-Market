// Prices are integer fen (分) inside the engine so TS and Python produce bit-identical results.
// All divisions use floor on non-negative integers (JS Math.floor == Python //).

export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

export function fenToYuan(fen: number): number {
  return fen / 100
}

export function pctOf(fen: number, pct: number): number {
  return Math.floor((fen * pct) / 100)
}

export function formatYuan(fen: number): string {
  const whole = Math.floor(fen / 100)
  const frac = fen % 100
  if (frac === 0) return String(whole)
  if (frac % 10 === 0) return `${whole}.${frac / 10}`
  return `${whole}.${String(frac).padStart(2, '0')}`
}

export function parseYuanToFen(text: string): number {
  const [whole, frac = ''] = text.split('.')
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2))
}

export function formatGrade(grade: number): string {
  if (grade >= 100) return '全新'
  if (grade % 10 === 0) return `${grade / 10}成新`
  return `${Math.floor(grade / 10)}.${grade % 10}成新`
}

export function formatCondition(grade: number, hasNotes: boolean): string {
  return `${formatGrade(grade)}·${hasNotes ? '有笔记' : '无笔记'}`
}

export function formatRequirementCondition(conditionMin: number | null, noNotes: boolean | null): string {
  const g = conditionMin === null ? '品相不限' : `≥${formatGrade(conditionMin)}`
  const n = noNotes === true ? '无笔记' : '笔记不限'
  return `${g}·${n}`
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? vars[k] : `{${k}}`))
}
