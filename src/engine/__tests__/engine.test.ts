import { describe, expect, it } from 'vitest'
import { engineContext } from '../../data/loader'
import { runSession } from '../negotiationEngine'
import { validate } from '../schemaValidate'
import { advanceEscrow, escrowDone, initialEscrow } from '../escrow'
import { GuardrailViolation, assertBuyerPrice, redactPii } from '../guardrails'
import type { EngineContext, SessionResult } from '../types'

const ctx = engineContext
const run = (text: string, c: EngineContext = ctx) => runSession(text, c)
const sent = (r: SessionResult) => r.messages.filter((m) => m.status === 'sent')
const withBuyer = (patch: Partial<EngineContext['buyer']>): EngineContext => ({ ...ctx, buyer: { ...ctx.buyer, ...patch } })

describe('negotiation engine — core cases', () => {
  it('deal: seller_A closes within budget after ≥3 rounds', () => {
    const r = run('帮我找一本 9 成新、无笔记的《人类简史》，预算 20 元')
    expect(r.match?.sellerId).toBe('seller_A')
    expect(r.outcome).toMatchObject({ status: 'deal', manualReview: false })
    expect(r.stats.rounds).toBeGreaterThanOrEqual(3)
    expect(r.dealDraft!.price).toBeLessThanOrEqual(20)
    expect(r.dealDraft).toMatchObject({ sellerId: 'seller_A', price: 19, round: 5 })
    for (const m of sent(r)) expect(validate(ctx.messageSchema, m.payload)).toEqual([])
  })

  it('impasse: seller_C (floor above budget) stops at 6 rounds and goes to manual review', () => {
    const r = run('想要一本 9.5 成新的《人类简史》，最好没有笔记，预算 20 元')
    expect(r.match?.sellerId).toBe('seller_C')
    expect(r.outcome).toMatchObject({ status: 'max_rounds', round: 6, manualReview: true })
    expect(r.guardrailEvents.map((e) => e.ruleId)).toContain('G-ROUNDS')
    expect(Math.max(...r.messages.map((m) => m.round))).toBe(6)
    expect(r.dealDraft).toBeNull()
  })

  it('over budget: accepting seller_G floor is blocked by G-BUDGET and not auto-advanced', () => {
    const r = run('《艺术的故事》9 成新，无笔记，预算 100 元')
    expect(r.outcome).toMatchObject({ status: 'over_budget', manualReview: true })
    const blocked = r.messages.filter((m) => m.status === 'blocked')
    expect(blocked).toHaveLength(1)
    expect(blocked[0].payload).toMatchObject({ intent: 'accept', price: 104 })
    expect(r.guardrailEvents.find((e) => e.ruleId === 'G-BUDGET')?.action).toBe('blocked')
    for (const m of sent(r).filter((x) => x.actor === 'buyer')) expect(m.payload.price as number).toBeLessThanOrEqual(100)
    expect(r.dealDraft).toBeNull()
  })

  it('message parse failure: invalid seller output retried once, then escalated to manual review', () => {
    const r = run('《三体》9 成新，无笔记，预算 25 元')
    expect(r.outcome).toMatchObject({ status: 'message_parse_failed', round: 2, manualReview: true })
    const invalid = r.messages.filter((m) => m.status === 'invalid')
    expect(invalid.map((m) => m.attempt)).toEqual([1, 2])
    expect(invalid[0].errors).toEqual(['$.intent: not in enum', '$.price: expected type number'])
    expect(r.guardrailEvents.filter((e) => e.ruleId === 'G-SCHEMA').map((e) => e.action)).toEqual(['retry', 'escalated'])
    expect(r.stats).toMatchObject({ parseErrors: 2 })
    expect(r.messages.at(-1)!.round).toBe(2)
  })
})

describe('negotiation engine — other branches', () => {
  it('requirement parse failure when title and budget are missing', () => {
    const r = run('随便来本书吧')
    expect(r.outcome).toMatchObject({ status: 'parse_failed', manualReview: true })
    expect(r.requirement?.missing).toEqual(['title', 'budget'])
    expect(r.messages).toHaveLength(0)
  })

  it('condition mismatch discovered via ask_condition is rejected', () => {
    const r = run('找一本无笔记的《置身事内》，8 成新以上，预算 25 元')
    expect(r.inquiry?.satisfied).toBe(false)
    expect(r.outcome?.status).toBe('condition_rejected')
    expect(r.messages[0].payload.intent).toBe('reject')
  })

  it('PII is redacted from buyer input and seller notes', () => {
    const r = run('《代码整洁之道》8 成新就行，预算 35 元，有消息打我电话 13812345678')
    expect(r.input.sanitized).not.toMatch(/13812345678/)
    expect(JSON.stringify(r.messages)).not.toMatch(/1[3-9][0-9]{9}/)
    expect(r.guardrailEvents.filter((e) => e.ruleId === 'G-PII').map((e) => e.actor)).toEqual(['buyer', 'seller'])
    expect(r.outcome?.status).toBe('deal')
  })

  it('price swing above 15% is clamped (seller_E)', () => {
    const r = run('《置身事内》7 成新也行，有笔记也行，预算 15 元')
    expect(r.match?.sellerId).toBe('seller_E')
    const swing = r.guardrailEvents.filter((e) => e.ruleId === 'G-SWING')
    expect(swing.length).toBeGreaterThan(0)
    const sellerPrices = sent(r).filter((m) => m.actor === 'seller').map((m) => Math.round((m.payload.price as number) * 100))
    let prev = 1800
    for (const p of sellerPrices) {
      expect(Math.abs(prev - p)).toBeLessThanOrEqual(Math.floor((prev * 15) / 100))
      prev = p
    }
  })

  it('transient glitch recovers after one retry (seller_I)', () => {
    const r = run('《三体》7 成新，笔记无所谓，预算 18 元')
    expect(r.match?.sellerId).toBe('seller_I')
    expect(r.messages.filter((m) => m.status === 'invalid')).toHaveLength(1)
    expect(r.guardrailEvents.filter((e) => e.ruleId === 'G-SCHEMA').map((e) => e.action)).toEqual(['retry'])
    expect(r.outcome?.status).not.toBe('message_parse_failed')
  })

  it('no match when nobody sells the book', () => {
    expect(run('《不存在的书》，预算 20 元').outcome?.status).toBe('no_match')
  })

  it('is deterministic', () => {
    const t = '帮我找一本 9 成新、无笔记的《人类简史》，预算 20 元'
    expect(run(t)).toStrictEqual(run(t))
  })

  it('config drives behaviour: changing openingRatioPct changes the first offer', () => {
    const t = '帮我找一本 9 成新、无笔记的《人类简史》，预算 20 元'
    const base = run(t).messages[0].payload.price
    const bolder = run(t, withBuyer({ openingRule: { ...ctx.buyer.openingRule, openingRatioPct: 60 } })).messages[0].payload.price
    expect(base).toBe(15)
    expect(bolder).toBe(12)
  })

  it('budget hard cap cannot be bypassed', () => {
    expect(() => assertBuyerPrice(2001, 2000)).toThrow(GuardrailViolation)
  })

  it('redacts id card numbers before phone numbers', () => {
    expect(redactPii('身份证 11010519900307123X 手机 13900001111').text).toBe('身份证 [身份证号已隐藏] 手机 [手机号已隐藏]')
  })
})

describe('escrow', () => {
  it('walks funds_held → shipped → received → released', () => {
    let s = initialEscrow
    for (let i = 0; i < 4; i++) s = advanceEscrow(s, i)
    expect(s.log.map((l) => l.key)).toEqual(['funds_held', 'shipped', 'received', 'released'])
    expect(escrowDone(s)).toBe(true)
    expect(advanceEscrow(s, 9)).toBe(s)
  })
})
