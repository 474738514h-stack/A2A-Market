import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import fixture from '@fixtures/benchmark.json'
import { engineContext } from '../../data/loader'
import { ENGINE_VERSION, runSession } from '../negotiationEngine'

const root = path.resolve(__dirname, '../../..')

describe('benchmark fixture (shared with eval/run_eval.py)', () => {
  it('was generated from the current config and mock files', () => {
    for (const [rel, hash] of Object.entries(fixture.configHashes)) {
      const actual = createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex')
      expect(actual, `${rel} changed — run \`npm run bench:gen\``).toBe(hash)
    }
    expect(fixture.engineVersion).toBe(ENGINE_VERSION)
  })

  for (const c of fixture.cases) {
    it(`${c.id} reproduces exactly`, () => {
      expect(JSON.parse(JSON.stringify(runSession(c.input, engineContext)))).toStrictEqual(c.expected)
    })
  }
})
