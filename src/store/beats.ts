import type { GuardrailEvent, MessageRecord, SessionResult } from '../engine/types'

export type Beat =
  | { kind: 'parse' }
  | { kind: 'match' }
  | { kind: 'inquiry' }
  | { kind: 'message'; message: MessageRecord }
  | { kind: 'guardrail'; event: GuardrailEvent }
  | { kind: 'outcome' }

/** Orders everything the timeline reveals, one beat at a time. */
export function buildBeats(s: SessionResult | null): Beat[] {
  if (!s) return []
  const beats: Beat[] = [{ kind: 'parse' }]
  if (s.match) beats.push({ kind: 'match' })
  if (s.inquiry) beats.push({ kind: 'inquiry' })
  const items: Array<{ seq: number; beat: Beat }> = [
    ...s.messages.map((m) => ({ seq: m.seq, beat: { kind: 'message', message: m } as Beat })),
    ...s.guardrailEvents.filter((e) => e.round !== null).map((e) => ({ seq: e.seq, beat: { kind: 'guardrail', event: e } as Beat })),
  ]
  items.sort((a, b) => a.seq - b.seq)
  beats.push(...items.map((i) => i.beat))
  beats.push({ kind: 'outcome' })
  return beats
}
