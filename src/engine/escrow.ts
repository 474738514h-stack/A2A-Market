// Simulated third-party escrow. Pure reducer; no money moves anywhere.

export const ESCROW_STEPS = [
  { key: 'funds_held', label: '资金托管', hint: '你的货款已由平台模拟托管，卖家暂时拿不到' },
  { key: 'shipped', label: '卖家发货', hint: '卖家已发货，模拟运单号 DEMO-SF-0001' },
  { key: 'received', label: '确认收货', hint: '你确认书已收到、品相与描述一致' },
  { key: 'released', label: '放款', hint: '平台把货款放给卖家，交易完成' },
] as const

export type EscrowKey = (typeof ESCROW_STEPS)[number]['key']

export interface EscrowState {
  /** Number of completed steps, 0..4 */
  completed: number
  log: Array<{ key: EscrowKey; at: number }>
}

export const initialEscrow: EscrowState = { completed: 0, log: [] }

export function advanceEscrow(state: EscrowState, at: number): EscrowState {
  if (state.completed >= ESCROW_STEPS.length) return state
  const step = ESCROW_STEPS[state.completed]
  return { completed: state.completed + 1, log: [...state.log, { key: step.key, at }] }
}

export function escrowDone(state: EscrowState): boolean {
  return state.completed >= ESCROW_STEPS.length
}
