import { formatCondition, formatGrade, formatRequirementCondition, formatYuan, fill, pctOf, yuanToFen } from './money'
import { parseRequirementText } from './requirementParser'
import { validate } from './schemaValidate'
import type { EngineContext, Inquiry, JsonSchema, MatchScore, Requirement, Seller } from './types'

export const TOOL_LABELS = {
  parse_requirement: '需求解析',
  broadcast_demand: '广播需求',
  match_seller: '匹配卖家',
  ask_condition: '询问品相',
  make_offer: '议价消息',
  confirm_deal: '生成交易草案',
} as const

export function toolOutputErrors(ctx: EngineContext, tool: string, output: unknown): string[] {
  const def = ctx.toolsSchema.tools[tool]
  if (!def) return []
  return validate(def.output, output, { 'message.schema.json': ctx.messageSchema as JsonSchema })
}

export function messageErrors(ctx: EngineContext, payload: unknown): string[] {
  return validate(ctx.messageSchema, payload)
}

export function parseRequirement(text: string, ctx: EngineContext): { requirement: Requirement; budgetFen: number | null } {
  const { budgetFen, ...requirement } = parseRequirementText(text, ctx.books)
  return { requirement, budgetFen }
}

export function broadcastDemand(bookId: string | null, ctx: EngineContext): string[] {
  if (bookId === null) return []
  return ctx.sellers.filter((s) => s.bookId === bookId).map((s) => s.id)
}

export function scoreSellers(req: Requirement, budgetFen: number, reached: string[], ctx: EngineContext): MatchScore[] {
  const scores = reached.map((id): MatchScore => {
    const s = ctx.sellers.find((x) => x.id === id)!
    const listFen = yuanToFen(s.listPrice)
    let rejectReason: string | null = null
    if (req.conditionMin !== null && s.listed.grade < req.conditionMin) {
      rejectReason = `品相 ${formatGrade(s.listed.grade)} 低于要求 ${formatGrade(req.conditionMin)}`
    } else if (req.noNotes === true && s.listed.hasNotes) {
      rejectReason = '标注有笔记'
    }
    const eligible = rejectReason === null
    const conditionFit = eligible ? 40 : 0
    const priceFit =
      listFen <= budgetFen ? 35 : Math.max(0, 35 - Math.floor(((listFen - budgetFen) * 100) / budgetFen))
    const reputationFit = pctOf(s.reputation, 25)
    return {
      sellerId: s.id,
      sellerName: s.name,
      grade: s.listed.grade,
      hasNotes: s.listed.hasNotes,
      listPrice: s.listPrice,
      reputation: s.reputation,
      style: s.style,
      eligible,
      rejectReason,
      conditionFit,
      priceFit: eligible ? priceFit : 0,
      reputationFit: eligible ? reputationFit : 0,
      total: eligible ? conditionFit + priceFit + reputationFit : 0,
    }
  })
  return scores.sort((a, b) => b.total - a.total || a.listPrice - b.listPrice || (a.sellerId < b.sellerId ? -1 : 1))
}

export function askCondition(seller: Seller, req: Requirement, ctx: EngineContext): Inquiry {
  const question = fill(ctx.buyer.reasonTemplates.askCondition, {
    wantGrade: req.conditionMin === null ? '品相不限' : `${formatGrade(req.conditionMin)}及以上`,
    wantNotes: req.noNotes === true ? '无笔记' : '笔记不限',
  })
  const tone = ctx.seller.toneRules.styles[seller.style]
  const { grade, hasNotes, defects } = seller.actual
  const reply = fill(tone.reply, {
    grade: formatGrade(grade),
    notes: hasNotes ? '有笔记' : '无笔记',
    defects: defects ? `${defects}。` : '',
  }).trim()
  const gaps: string[] = []
  if (req.conditionMin !== null && grade < req.conditionMin) {
    gaps.push(`实际 ${formatGrade(grade)}，低于要求的 ${formatGrade(req.conditionMin)}`)
  }
  if (req.noNotes === true && hasNotes) {
    gaps.push(`有笔记：${defects || '有书写痕迹'}`)
  }
  return {
    sellerId: seller.id,
    question,
    answer: { grade, hasNotes, defects, reply },
    satisfied: gaps.length === 0,
    gaps,
  }
}

export function buildDealDraft(seller: Seller, book: { title: string }, priceFen: number, budgetFen: number, round: number) {
  return {
    bookTitle: book.title,
    sellerId: seller.id,
    sellerName: seller.name,
    condition: formatCondition(seller.actual.grade, seller.actual.hasNotes),
    price: priceFen / 100,
    listPrice: seller.listPrice,
    budget: budgetFen / 100,
    fulfillment: '快递发货 · 资金由平台模拟托管，确认收货后放款',
    round,
  }
}

export function requirementSummary(req: Requirement, budgetFen: number): string {
  return `《${req.title}》 · ${formatRequirementCondition(req.conditionMin, req.noNotes)} · 预算 ${formatYuan(budgetFen)} 元`
}
