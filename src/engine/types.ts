export type Intent = 'offer' | 'counter' | 'accept' | 'reject'
export type Actor = 'buyer' | 'seller' | 'system'
export type ToolName = 'parse_requirement' | 'broadcast_demand' | 'match_seller' | 'ask_condition' | 'make_offer' | 'confirm_deal'

export interface NegotiationMessage {
  intent: Intent
  price: number
  condition: string
  notes: string
  reason: string
}

export interface Book {
  id: string
  title: string
  aliases: string[]
  author: string
  isbnLike: string
  listPriceRange: [number, number]
  conditionDistribution: Record<string, number>
}

export interface Seller {
  id: string
  name: string
  bookId: string
  listed: { grade: number; hasNotes: boolean }
  actual: { grade: number; hasNotes: boolean; defects: string }
  listPrice: number
  floorPrice: number
  concessionPace: string
  inventoryPressure: string
  reputation: number
  style: string
  notes: string
  glitch: { round: number; mode: 'persistent' | 'transient' } | null
}

export interface BuyerPrompt {
  version: string
  openingRule: { ruleId: string; openingRatioPct: number }
  concessionPlan: { ruleId: string; stepPctOfBudget: number }
  acceptRule: { ruleId: string }
  walkawayRule: { ruleId: string; maxRounds: number; nearMissPct: number }
  conditionRule: { ruleId: string }
  budgetCap: { ruleId: string }
  safetyRules: Array<{ ruleId: string; maxRounds?: number; maxSwingPct?: number; maxRetries?: number }>
  reasonTemplates: Record<string, string>
  [k: string]: unknown
}

export interface SellerPrompt {
  version: string
  floorPrice: { ruleId: string }
  openingRule: { ruleId: string }
  concessionPace: { ruleId: string; levels: Record<string, { stepPctOfGap: number }> }
  disclosureRule: { ruleId: string }
  toneRules: { ruleId: string; styles: Record<string, Record<string, string>> }
  [k: string]: unknown
}

export type JsonSchema = Record<string, unknown>

export interface EngineContext {
  buyer: BuyerPrompt
  seller: SellerPrompt
  books: Book[]
  sellers: Seller[]
  messageSchema: JsonSchema
  toolsSchema: { tools: Record<string, { input: JsonSchema; output: JsonSchema }> } & Record<string, unknown>
}

export interface Requirement {
  title: string | null
  bookId: string | null
  conditionMin: number | null
  noNotes: boolean | null
  budget: number | null
  confidence: { title: number; condition: number; notes: number; budget: number }
  matchedText: { title: string | null; condition: string | null; notes: string | null; budget: string | null }
  missing: Array<'title' | 'budget'>
}

export interface MatchScore {
  sellerId: string
  sellerName: string
  grade: number
  hasNotes: boolean
  listPrice: number
  reputation: number
  style: string
  eligible: boolean
  rejectReason: string | null
  conditionFit: number
  priceFit: number
  reputationFit: number
  total: number
}

export interface Inquiry {
  sellerId: string
  question: string
  answer: { grade: number; hasNotes: boolean; defects: string; reply: string }
  satisfied: boolean
  gaps: string[]
}

export type MessageStatus = 'sent' | 'invalid' | 'blocked'

export interface MessageRecord {
  seq: number
  round: number
  actor: 'buyer' | 'seller'
  tool: 'make_offer'
  attempt: number
  status: MessageStatus
  payload: Record<string, unknown>
  errors: string[]
  source: { prompt: string; ruleId: string }
}

export type GuardrailAction = 'redacted' | 'clamped' | 'blocked' | 'stopped' | 'retry' | 'escalated'

export interface GuardrailEvent {
  seq: number
  ruleId: string
  round: number | null
  actor: Actor
  action: GuardrailAction
  detail: string
}

export interface ToolCall {
  seq: number
  tool: ToolName
  actor: Actor
  round: number | null
  status: 'ok' | 'error' | 'blocked'
  summary: string
}

export type OutcomeStatus =
  | 'deal'
  | 'max_rounds'
  | 'over_budget'
  | 'condition_rejected'
  | 'message_parse_failed'
  | 'parse_failed'
  | 'no_match'
  | 'walkaway'

export interface Outcome {
  status: OutcomeStatus
  round: number
  manualReview: boolean
  detail: string
}

export interface DealDraft {
  bookTitle: string
  sellerId: string
  sellerName: string
  condition: string
  price: number
  listPrice: number
  budget: number
  fulfillment: string
  round: number
}

export type Stage = 'parse' | 'broadcast' | 'match' | 'inquire' | 'negotiate' | 'draft' | 'done'

export interface SessionResult {
  engineVersion: string
  promptVersions: { buyer: string; seller: string }
  input: { raw: string; sanitized: string }
  requirement: Requirement | null
  candidates: string[]
  match: { sellerId: string | null; scores: MatchScore[] } | null
  inquiry: Inquiry | null
  messages: MessageRecord[]
  guardrailEvents: GuardrailEvent[]
  toolCalls: ToolCall[]
  outcome: Outcome | null
  dealDraft: DealDraft | null
  stats: { rounds: number; messageAttempts: number; messageValid: number; parseErrors: number }
}
