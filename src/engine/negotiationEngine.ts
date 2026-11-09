import { assertBuyerPrice, assertRound, assertSellerFloor, assertSwing, clampSwing, piiDetail, redactPii, swingDetail } from './guardrails'
import { fenToYuan, fill, formatRequirementCondition, formatYuan, pctOf, yuanToFen, formatCondition } from './money'
import {
  askCondition,
  broadcastDemand,
  buildDealDraft,
  messageErrors,
  parseRequirement,
  requirementSummary,
  scoreSellers,
  toolOutputErrors,
} from './tools'
import type {
  Actor,
  EngineContext,
  GuardrailAction,
  Intent,
  MessageStatus,
  Outcome,
  OutcomeStatus,
  Seller,
  SessionResult,
  Stage,
  ToolCall,
} from './types'

/**
 * Negotiation state machine:
 *   parse_requirement → broadcast_demand → match_seller → ask_condition → negotiate(≤6) → confirm_deal
 * `stepSession` is pure (returns a new state). Human confirmation and escrow happen after `done`
 * in the UI (see escrow.ts). eval/run_eval.py mirrors this file step for step; keep them in sync and
 * regenerate fixtures/benchmark.json (`npm run bench:gen`) after any behavioural change.
 */

export const ENGINE_VERSION = '1.0.0'

const INTENT_LABEL: Record<Intent, string> = { offer: '出价', counter: '还价', accept: '接受', reject: '拒绝' }

export interface EngineState {
  stage: Stage
  seq: number
  result: SessionResult
  budgetFen: number
  sellerId: string | null
  sellerAskFen: number
  sellerAtFloor: boolean
  buyerLastFen: number | null
  round: number
  dealFen: number | null
}

function safetyValue(ctx: EngineContext, ruleId: string, key: 'maxRounds' | 'maxSwingPct' | 'maxRetries'): number {
  const rule = ctx.buyer.safetyRules.find((r) => r.ruleId === ruleId)
  const v = rule?.[key]
  if (typeof v !== 'number') throw new Error(`config/prompts/buyer.json: safetyRules ${ruleId}.${key} missing`)
  return v
}

export function initSession(raw: string, ctx: EngineContext): EngineState {
  return {
    stage: 'parse',
    seq: 0,
    budgetFen: 0,
    sellerId: null,
    sellerAskFen: 0,
    sellerAtFloor: false,
    buyerLastFen: null,
    round: 0,
    dealFen: null,
    result: {
      engineVersion: ENGINE_VERSION,
      promptVersions: { buyer: ctx.buyer.version, seller: ctx.seller.version },
      input: { raw, sanitized: raw },
      requirement: null,
      candidates: [],
      match: null,
      inquiry: null,
      messages: [],
      guardrailEvents: [],
      toolCalls: [],
      outcome: null,
      dealDraft: null,
      stats: { rounds: 0, messageAttempts: 0, messageValid: 0, parseErrors: 0 },
    },
  }
}

function nextSeq(s: EngineState): number {
  s.seq += 1
  return s.seq
}

function event(s: EngineState, ruleId: string, round: number | null, actor: Actor, action: GuardrailAction, detail: string) {
  s.result.guardrailEvents.push({ seq: nextSeq(s), ruleId, round, actor, action, detail })
}

function tool(s: EngineState, t: ToolCall['tool'], actor: Actor, round: number | null, status: ToolCall['status'], summary: string) {
  s.result.toolCalls.push({ seq: nextSeq(s), tool: t, actor, round, status, summary })
}

function finish(s: EngineState, status: OutcomeStatus, round: number, detail: string) {
  const outcome: Outcome = { status, round, manualReview: status !== 'deal', detail }
  s.result.outcome = outcome
  s.stage = 'done'
}

function sellerOf(s: EngineState, ctx: EngineContext): Seller {
  return ctx.sellers.find((x) => x.id === s.sellerId)!
}

/**
 * Emits one message through the schema gate. `produce(attempt)` builds the payload; failed
 * validation is retried up to G-SCHEMA.maxRetries times, then escalated. Returns false when escalated.
 */
function emit(
  s: EngineState,
  ctx: EngineContext,
  actor: 'buyer' | 'seller',
  round: number,
  source: { prompt: string; ruleId: string },
  produce: (attempt: number) => Record<string, unknown>,
  status: MessageStatus = 'sent',
): boolean {
  const maxRetries = safetyValue(ctx, 'G-SCHEMA', 'maxRetries')
  for (let attempt = 1; attempt <= 1 + maxRetries; attempt++) {
    const payload = produce(attempt)
    const errors = messageErrors(ctx, payload)
    const valid = errors.length === 0
    s.result.stats.messageAttempts += 1
    if (valid) s.result.stats.messageValid += 1
    else s.result.stats.parseErrors += 1
    s.result.messages.push({
      seq: nextSeq(s),
      round,
      actor,
      tool: 'make_offer',
      attempt,
      status: valid ? status : 'invalid',
      payload,
      errors,
      source,
    })
    if (valid) {
      const p = payload as { intent: Intent; price: number }
      tool(s, 'make_offer', actor, round, status === 'blocked' ? 'blocked' : 'ok', `${INTENT_LABEL[p.intent]} ${formatYuan(yuanToFen(p.price))} 元`)
      return true
    }
    tool(s, 'make_offer', actor, round, 'error', 'Schema 校验失败')
    if (attempt <= maxRetries) {
      event(s, 'G-SCHEMA', round, actor, 'retry', `消息未通过 Schema 校验（${errors.join('; ')}），重试 1 次`)
    } else {
      event(s, 'G-SCHEMA', round, actor, 'escalated', '重试后仍未通过校验，停止自动议价并转人工')
    }
  }
  return false
}

function stepParse(s: EngineState, ctx: EngineContext) {
  const { text, hits } = redactPii(s.result.input.raw)
  s.result.input.sanitized = text
  for (const h of hits) event(s, 'G-PII', null, 'buyer', 'redacted', piiDetail(h))

  const { requirement, budgetFen } = parseRequirement(text, ctx)
  const errors = toolOutputErrors(ctx, 'parse_requirement', requirement)
  if (errors.length > 0) {
    tool(s, 'parse_requirement', 'buyer', null, 'error', 'Schema 校验失败')
    finish(s, 'parse_failed', 0, `解析结果未通过 Schema 校验：${errors.join('; ')}`)
    return
  }
  s.result.requirement = requirement
  if (requirement.missing.length > 0 || budgetFen === null) {
    const labels = requirement.missing.map((m) => (m === 'title' ? '书名' : '预算'))
    tool(s, 'parse_requirement', 'buyer', null, 'error', `未识别：${labels.join('、')}`)
    finish(s, 'parse_failed', 0, `没能识别出${labels.join('和')}`)
    return
  }
  s.budgetFen = budgetFen
  tool(s, 'parse_requirement', 'buyer', null, 'ok', requirementSummary(requirement, budgetFen))
  s.stage = 'broadcast'
}

function stepBroadcast(s: EngineState, ctx: EngineContext) {
  const req = s.result.requirement!
  const reached = broadcastDemand(req.bookId, ctx)
  s.result.candidates = reached
  tool(s, 'broadcast_demand', 'buyer', null, reached.length > 0 ? 'ok' : 'error', `已广播给 ${reached.length} 位卖家 Agent`)
  if (reached.length === 0) {
    finish(s, 'no_match', 0, `暂时没有卖家在卖《${req.title}》`)
    return
  }
  s.stage = 'match'
}

function stepMatch(s: EngineState, ctx: EngineContext) {
  const req = s.result.requirement!
  const scores = scoreSellers(req, s.budgetFen, s.result.candidates, ctx)
  const best = scores.find((x) => x.eligible) ?? null
  s.result.match = { sellerId: best ? best.sellerId : null, scores }
  if (!best) {
    tool(s, 'match_seller', 'buyer', null, 'error', `${scores.length} 位卖家均不满足品相要求`)
    finish(s, 'no_match', 0, `找到 ${scores.length} 位卖家，但品相都不满足你的要求`)
    return
  }
  tool(s, 'match_seller', 'buyer', null, 'ok', `命中 ${best.sellerName}（匹配分 ${best.total}）`)
  s.sellerId = best.sellerId
  s.sellerAskFen = yuanToFen(sellerOf(s, ctx).listPrice)
  s.stage = 'inquire'
}

function stepInquire(s: EngineState, ctx: EngineContext) {
  const req = s.result.requirement!
  const seller = sellerOf(s, ctx)
  const inquiry = askCondition(seller, req, ctx)
  const errors = toolOutputErrors(ctx, 'ask_condition', inquiry.answer)
  s.result.inquiry = inquiry
  if (errors.length > 0) {
    tool(s, 'ask_condition', 'buyer', null, 'error', 'Schema 校验失败')
    finish(s, 'message_parse_failed', 0, `品相回复未通过 Schema 校验：${errors.join('; ')}`)
    return
  }
  const cond = formatCondition(inquiry.answer.grade, inquiry.answer.hasNotes)
  tool(
    s,
    'ask_condition',
    'buyer',
    null,
    inquiry.satisfied ? 'ok' : 'error',
    inquiry.satisfied ? `品相符合要求（${cond}）` : `品相不符：${inquiry.gaps.join('；')}`,
  )
  if (!inquiry.satisfied) {
    s.round = 1
    s.result.stats.rounds = 1
    const gap = inquiry.gaps.join('；')
    emit(s, ctx, 'buyer', 1, { prompt: `buyer@${ctx.buyer.version}`, ruleId: ctx.buyer.conditionRule.ruleId }, () => ({
      intent: 'reject',
      price: fenToYuan(s.sellerAskFen),
      condition: formatRequirementCondition(req.conditionMin, req.noNotes),
      notes: '',
      reason: fill(ctx.buyer.reasonTemplates.rejectCondition, { gap }),
    }))
    finish(s, 'condition_rejected', 1, `卖家实际品相不满足要求：${gap}`)
    return
  }
  s.round = 1
  s.stage = 'negotiate'
}

function stepNegotiate(s: EngineState, ctx: EngineContext) {
  const req = s.result.requirement!
  const seller = sellerOf(s, ctx)
  const maxRounds = safetyValue(ctx, 'G-ROUNDS', 'maxRounds')
  const maxSwing = safetyValue(ctx, 'G-SWING', 'maxSwingPct')
  const r = s.round
  assertRound(r, maxRounds)
  s.result.stats.rounds = r

  const B = s.budgetFen
  const ask = s.sellerAskFen
  const listFen = yuanToFen(seller.listPrice)
  const floorFen = yuanToFen(seller.floorPrice)
  const buyerSrc = (ruleId: string) => ({ prompt: `buyer@${ctx.buyer.version}`, ruleId })
  const sellerSrc = (ruleId: string) => ({ prompt: `seller@${ctx.seller.version}`, ruleId })
  const buyerCond = formatRequirementCondition(req.conditionMin, req.noNotes)
  const sellerCond = formatCondition(seller.actual.grade, seller.actual.hasNotes)
  const tpl = ctx.buyer.reasonTemplates
  const tone = ctx.seller.toneRules.styles[seller.style]

  const open = pctOf(B, ctx.buyer.openingRule.openingRatioPct)
  const step = pctOf(B, ctx.buyer.concessionPlan.stepPctOfBudget)
  const planned = r === 1 ? open : Math.min(B, (s.buyerLastFen ?? open) + step)

  // Buyer turn
  if (ask <= Math.min(B, planned) || (s.sellerAtFloor && ask <= B)) {
    const reasonKey = s.sellerAtFloor && ask > planned ? 'acceptFloor' : 'acceptAsk'
    assertBuyerPrice(ask, B)
    const ok = emit(s, ctx, 'buyer', r, buyerSrc(ctx.buyer.acceptRule.ruleId), () => ({
      intent: 'accept',
      price: fenToYuan(ask),
      condition: buyerCond,
      notes: '',
      reason: fill(tpl[reasonKey], { price: formatYuan(ask) }),
    }))
    if (!ok) return finish(s, 'message_parse_failed', r, `第 ${r} 轮买家消息连续未通过 Schema 校验`)
    s.dealFen = ask
    s.stage = 'draft'
    return
  }
  if (s.sellerAtFloor) {
    const overPct = Math.floor(((ask - B) * 100) / B)
    if (ask * 100 <= B * (100 + ctx.buyer.walkawayRule.nearMissPct)) {
      emit(
        s,
        ctx,
        'buyer',
        r,
        buyerSrc(ctx.buyer.acceptRule.ruleId),
        () => ({
          intent: 'accept',
          price: fenToYuan(ask),
          condition: buyerCond,
          notes: '',
          reason: fill(tpl.acceptFloor, { price: formatYuan(ask) }),
        }),
        'blocked',
      )
      event(s, 'G-BUDGET', r, 'buyer', 'blocked', `拟接受 ${formatYuan(ask)} 元，超出预算 ${formatYuan(B)} 元，已拦截，需要你确认是否加价`)
      return finish(s, 'over_budget', r, `卖家底价 ${formatYuan(ask)} 元，超出你的预算 ${formatYuan(B)} 元（约 ${overPct}%）`)
    }
    const last = s.buyerLastFen ?? open
    const ok = emit(s, ctx, 'buyer', r, buyerSrc(ctx.buyer.walkawayRule.ruleId), () => ({
      intent: 'reject',
      price: fenToYuan(last),
      condition: buyerCond,
      notes: '',
      reason: tpl.rejectFloor,
    }))
    if (!ok) return finish(s, 'message_parse_failed', r, `第 ${r} 轮买家消息连续未通过 Schema 校验`)
    return finish(s, 'walkaway', r, `卖家底价 ${formatYuan(ask)} 元，比你的预算高出 ${overPct}%`)
  }

  let bid = planned
  if (s.buyerLastFen !== null) {
    const c = clampSwing(s.buyerLastFen, bid, maxSwing)
    if (c.clamped) event(s, 'G-SWING', r, 'buyer', 'clamped', swingDetail('买家', c.swingPct, maxSwing, c.price))
    bid = c.price
    assertSwing(s.buyerLastFen, bid, maxSwing)
  }
  assertBuyerPrice(bid, B)
  const bidKey = bid === B ? 'counterAtCap' : r === 1 ? 'open' : 'counter'
  const bidRule = r === 1 ? ctx.buyer.openingRule.ruleId : ctx.buyer.concessionPlan.ruleId
  const okBid = emit(s, ctx, 'buyer', r, buyerSrc(bidRule), () => ({
    intent: r === 1 ? 'offer' : 'counter',
    price: fenToYuan(bid),
    condition: buyerCond,
    notes: '',
    reason: fill(tpl[bidKey], { price: formatYuan(bid) }),
  }))
  if (!okBid) return finish(s, 'message_parse_failed', r, `第 ${r} 轮买家消息连续未通过 Schema 校验`)
  s.buyerLastFen = bid

  // Seller turn
  const pace = ctx.seller.concessionPace.levels[seller.concessionPace]
  if (!pace) throw new Error(`config/prompts/seller.json: concessionPace.levels.${seller.concessionPace} missing`)
  const paceStep = pctOf(listFen - floorFen, pace.stepPctOfGap)
  let next = Math.max(floorFen, ask - paceStep)
  const sellerAccepts = bid >= next
  let notes = ''
  if (r === 1 && seller.notes) {
    const red = redactPii(seller.notes)
    for (const h of red.hits) event(s, 'G-PII', r, 'seller', 'redacted', piiDetail(h))
    notes = red.text
  }
  if (!sellerAccepts) {
    const c = clampSwing(ask, next, maxSwing)
    if (c.clamped) event(s, 'G-SWING', r, 'seller', 'clamped', swingDetail('卖家', c.swingPct, maxSwing, c.price))
    next = c.price
    assertSwing(ask, next, maxSwing)
    assertSellerFloor(next, floorFen)
  }
  const atFloor = !sellerAccepts && next === floorFen
  const sellerPrice = sellerAccepts ? bid : next
  const sellerKey = sellerAccepts ? 'accept' : atFloor ? 'floor' : 'counter'
  const sellerRule = sellerAccepts ? ctx.seller.concessionPace.ruleId : atFloor ? ctx.seller.floorPrice.ruleId : ctx.seller.concessionPace.ruleId
  const glitch = seller.glitch
  const okSeller = emit(s, ctx, 'seller', r, sellerSrc(sellerRule), (attempt) => {
    const corrupt = glitch !== null && glitch.round === r && (attempt === 1 || glitch.mode === 'persistent')
    if (corrupt) {
      return {
        intent: 'maybe',
        price: `${formatYuan(sellerPrice)}元`,
        condition: sellerCond,
        notes,
        reason: '这个价嘛……再看看',
      }
    }
    return {
      intent: sellerAccepts ? 'accept' : 'counter',
      price: fenToYuan(sellerPrice),
      condition: sellerCond,
      notes,
      reason: fill(tone[sellerKey], { price: formatYuan(sellerPrice) }),
    }
  })
  if (!okSeller) return finish(s, 'message_parse_failed', r, `第 ${r} 轮卖家消息连续 2 次未通过 Schema 校验`)

  if (sellerAccepts) {
    s.dealFen = bid
    s.stage = 'draft'
    return
  }
  s.sellerAskFen = next
  s.sellerAtFloor = atFloor
  if (r >= maxRounds) {
    event(s, 'G-ROUNDS', r, 'system', 'stopped', `已达 ${maxRounds} 轮上限仍未成交，停止自动议价`)
    return finish(s, 'max_rounds', r, `谈了 ${r} 轮，卖家最新报价 ${formatYuan(next)} 元，你的出价 ${formatYuan(bid)} 元`)
  }
  s.round = r + 1
}

function stepDraft(s: EngineState, ctx: EngineContext) {
  const seller = sellerOf(s, ctx)
  const book = ctx.books.find((b) => b.id === seller.bookId)!
  const price = s.dealFen!
  const draft = buildDealDraft(seller, book, price, s.budgetFen, s.round)
  const errors = toolOutputErrors(ctx, 'confirm_deal', draft)
  if (errors.length > 0) {
    tool(s, 'confirm_deal', 'system', s.round, 'error', 'Schema 校验失败')
    return finish(s, 'message_parse_failed', s.round, `交易草案未通过 Schema 校验：${errors.join('; ')}`)
  }
  s.result.dealDraft = draft
  tool(s, 'confirm_deal', 'system', s.round, 'ok', `生成交易草案：${formatYuan(price)} 元`)
  const saved = yuanToFen(seller.listPrice) - price
  finish(s, 'deal', s.round, `第 ${s.round} 轮以 ${formatYuan(price)} 元成交，比挂牌价省 ${formatYuan(saved)} 元`)
}

export function stepSession(state: EngineState, ctx: EngineContext): EngineState {
  if (state.stage === 'done') return state
  const s = structuredClone(state)
  switch (s.stage) {
    case 'parse':
      stepParse(s, ctx)
      break
    case 'broadcast':
      stepBroadcast(s, ctx)
      break
    case 'match':
      stepMatch(s, ctx)
      break
    case 'inquire':
      stepInquire(s, ctx)
      break
    case 'negotiate':
      stepNegotiate(s, ctx)
      break
    case 'draft':
      stepDraft(s, ctx)
      break
  }
  return s
}

export function runSession(raw: string, ctx: EngineContext): SessionResult {
  let s = initSession(raw, ctx)
  for (let i = 0; i < 64 && s.stage !== 'done'; i++) s = stepSession(s, ctx)
  if (s.stage !== 'done') throw new Error('engine did not terminate')
  return s.result
}
