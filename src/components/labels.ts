import type { Intent, OutcomeStatus, ToolName } from '../engine/types'

export const INTENT_META: Record<Intent, { label: string; tone: 'primary' | 'neutral' | 'success' | 'danger' }> = {
  offer: { label: '出价 offer', tone: 'primary' },
  counter: { label: '还价 counter', tone: 'neutral' },
  accept: { label: '接受 accept', tone: 'success' },
  reject: { label: '拒绝 reject', tone: 'danger' },
}

export const OUTCOME_COPY: Record<OutcomeStatus, { title: string; body: string }> = {
  deal: { title: '谈成啦！', body: '买家 Agent 已帮你拿下这本书，确认一下交易草案吧。' },
  max_rounds: {
    title: '这次没谈拢，要不要看看别的卖家？',
    body: '已经谈满 6 轮，双方价格还有差距，自动议价已停下，等你来拿主意。',
  },
  over_budget: {
    title: '卖家的底价比你的预算高一点',
    body: '为了守住你的预算，买家 Agent 没有自动接受。要不要加一点预算，由你亲自确认。',
  },
  condition_rejected: {
    title: '这本的品相和你的要求不太一样',
    body: '买家 Agent 问清楚后替你婉拒了，换一位卖家或放宽一点品相要求试试？',
  },
  message_parse_failed: {
    title: '卖家 Agent 的回复格式出了点问题',
    body: '重试一次后还是读不懂对方的消息，为了不出错，已停止自动议价，转给人工确认。',
  },
  parse_failed: {
    title: '我还没完全看懂你的需求',
    body: '写上书名（用《》括起来）和预算会更准，例如「《人类简史》9 成新，预算 20 元」。',
  },
  no_match: { title: '暂时没找到合适的卖家', body: '可以换本书，或者放宽一点品相要求再试试。' },
  walkaway: { title: '价格差得有点多，这次先算了', body: '卖家的底价离你的预算太远，买家 Agent 礼貌地结束了对话。' },
}

export const TOOL_NAMES: Record<ToolName, string> = {
  parse_requirement: 'parse_requirement',
  broadcast_demand: 'broadcast_demand',
  match_seller: 'match_seller',
  ask_condition: 'ask_condition',
  make_offer: 'make_offer',
  confirm_deal: 'confirm_deal',
}

export const STYLE_LABEL: Record<string, string> = { warm: '热情', brief: '简洁', firm: '强硬' }

export const RULE_LABEL: Record<string, string> = {
  'G-BUDGET': '预算硬上限',
  'G-ROUNDS': '最多 6 轮',
  'G-SWING': '单轮波动 ≤15%',
  'G-PII': '敏感信息过滤',
  'G-SCHEMA': '结构化输出校验',
}
