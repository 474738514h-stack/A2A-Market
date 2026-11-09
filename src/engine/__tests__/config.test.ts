import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../../..')
const FILES = ['config/prompts/buyer.json', 'config/prompts/seller.json', 'config/schemas/message.schema.json', 'config/schemas/tools.schema.json']

describe('prompt & schema config files', () => {
  for (const rel of FILES) {
    it(`${rel} carries version, effectiveDate and changelog`, () => {
      const json = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8'))
      expect(json.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(json.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Array.isArray(json.changelog) && json.changelog.length).toBeTruthy()
      expect(json.changelog[0].version).toBe(json.version)
    })
  }

  it('buyer safety rules expose the numeric guardrail limits the engine requires', () => {
    const buyer = JSON.parse(fs.readFileSync(path.join(root, 'config/prompts/buyer.json'), 'utf-8'))
    const rule = (id: string) => buyer.safetyRules.find((r: { ruleId: string }) => r.ruleId === id)
    expect(rule('G-ROUNDS').maxRounds).toBe(6)
    expect(rule('G-SWING').maxSwingPct).toBe(15)
    expect(rule('G-SCHEMA').maxRetries).toBe(1)
  })
})
