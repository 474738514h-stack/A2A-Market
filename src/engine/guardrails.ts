import { formatYuan, pctOf } from './money'

export const PII_PATTERNS: Array<{ kind: 'id_card' | 'phone'; label: string; re: RegExp; mask: string }> = [
  { kind: 'id_card', label: '身份证号', re: /(?<![0-9])[1-9][0-9]{16}[0-9Xx](?![0-9A-Za-z])/g, mask: '[身份证号已隐藏]' },
  { kind: 'phone', label: '手机号', re: /(?<![0-9])1[3-9][0-9]{9}(?![0-9])/g, mask: '[手机号已隐藏]' },
]

export interface PiiHit {
  label: string
  count: number
}

export function redactPii(text: string): { text: string; hits: PiiHit[] } {
  let out = text
  const hits: PiiHit[] = []
  for (const p of PII_PATTERNS) {
    const matches = out.match(p.re)
    if (matches && matches.length > 0) {
      hits.push({ label: p.label, count: matches.length })
      out = out.replace(p.re, p.mask)
    }
  }
  return { text: out, hits }
}

export function piiDetail(hit: PiiHit): string {
  return `已隐藏 ${hit.count} 处${hit.label}`
}

/** Caps a price move to maxSwingPct of the actor's previous price. Returns the allowed price. */
export function clampSwing(prevFen: number, nextFen: number, maxSwingPct: number): { price: number; clamped: boolean; swingPct: number } {
  const maxMove = pctOf(prevFen, maxSwingPct)
  const diff = Math.abs(nextFen - prevFen)
  const swingPct = prevFen > 0 ? Math.floor((diff * 100) / prevFen) : 0
  if (diff <= maxMove) return { price: nextFen, clamped: false, swingPct }
  return { price: nextFen > prevFen ? prevFen + maxMove : prevFen - maxMove, clamped: true, swingPct }
}

export function swingDetail(actorLabel: string, swingPct: number, maxSwingPct: number, priceFen: number): string {
  return `${actorLabel}报价变动 ${swingPct}% 超过 ${maxSwingPct}%，已截断为 ${formatYuan(priceFen)} 元`
}

export class GuardrailViolation extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GuardrailViolation'
  }
}

/** Hard invariants — these can never be bypassed by strategy or config. */
export function assertBuyerPrice(priceFen: number, budgetFen: number): void {
  if (priceFen > budgetFen) throw new GuardrailViolation(`G-BUDGET: buyer price ${priceFen} exceeds budget ${budgetFen}`)
}

export function assertRound(round: number, maxRounds: number): void {
  if (round > maxRounds) throw new GuardrailViolation(`G-ROUNDS: round ${round} exceeds max ${maxRounds}`)
}

export function assertSwing(prevFen: number, nextFen: number, maxSwingPct: number): void {
  if (Math.abs(nextFen - prevFen) > pctOf(prevFen, maxSwingPct))
    throw new GuardrailViolation(`G-SWING: move ${prevFen}->${nextFen} exceeds ${maxSwingPct}%`)
}

export function assertSellerFloor(priceFen: number, floorFen: number): void {
  if (priceFen < floorFen) throw new GuardrailViolation(`S-FLOOR: seller price ${priceFen} below floor ${floorFen}`)
}
