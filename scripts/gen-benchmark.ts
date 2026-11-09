// Generates fixtures/benchmark.json — the shared reference cases that both the TS engine
// (src/engine/__tests__/benchmark.test.ts) and eval/run_eval.py must reproduce exactly.
// Run: npm run bench:gen
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENGINE_VERSION, runSession } from '../src/engine/negotiationEngine'
import type { EngineContext } from '../src/engine/types'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const CONTEXT_FILES = [
  'config/prompts/buyer.json',
  'config/prompts/seller.json',
  'config/schemas/message.schema.json',
  'config/schemas/tools.schema.json',
  'mock/books.json',
  'mock/sellers.json',
] as const

const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8'))
const sha256 = (rel: string) => createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex')

const ctx: EngineContext = {
  buyer: read('config/prompts/buyer.json'),
  seller: read('config/prompts/seller.json'),
  messageSchema: read('config/schemas/message.schema.json'),
  toolsSchema: read('config/schemas/tools.schema.json'),
  books: read('mock/books.json').books,
  sellers: read('mock/sellers.json').sellers,
}

const CASES = [
  {
    id: 'bench-deal-seller-A',
    description: 'seller_A 慢让价，预算 20 元，第 5 轮以 19 元成交',
    input: '帮我找一本 9 成新、无笔记的《人类简史》，预算 20 元',
  },
  {
    id: 'bench-impasse-seller-C',
    description: 'seller_C 强硬，底价 22 > 预算 20，6 轮后停止（G-ROUNDS）',
    input: '想要一本 9.5 成新的《人类简史》，最好没有笔记，预算 20 元',
  },
  {
    id: 'bench-over-budget-seller-G',
    description: 'seller_G 报出底价 104 > 预算 100，自动接受被 G-BUDGET 拦截',
    input: '《艺术的故事》9 成新，无笔记，预算 100 元',
  },
  {
    id: 'bench-parse-fail-seller-H',
    description: 'seller_H 第 2 轮消息连续两次未通过 Schema 校验（G-SCHEMA 重试 1 次后转人工）',
    input: '《三体》9 成新，无笔记，预算 25 元',
  },
]

const fixture = {
  _notice: '演示数据 · 脚本模拟。由 scripts/gen-benchmark.ts 生成，请勿手改；TS 引擎与 eval/run_eval.py 必须逐字段复现 expected。',
  fixtureVersion: '1.0.0',
  engineVersion: ENGINE_VERSION,
  generator: 'scripts/gen-benchmark.ts',
  comparison: {
    structure: '递归比较：对象键集合一致、数组长度与顺序一致、字符串逐字一致、布尔/null 一致',
    numbers: '价格以「分」为整数计算后 /100 输出；比较时要求 round(x*100) 相等且 |a-b| < 1e-9。JSON 只有一种数字类型，19 与 19.0 视为相等',
    breakpoints: 'outcome.status / outcome.round / stats 与最后一条消息的 seq 必须一致（终止点一致）',
  },
  configHashes: Object.fromEntries(CONTEXT_FILES.map((f) => [f, sha256(f)])),
  cases: CASES.map((c) => ({ ...c, expected: runSession(c.input, ctx) })),
}

fs.mkdirSync(path.join(root, 'fixtures'), { recursive: true })
fs.writeFileSync(path.join(root, 'fixtures', 'benchmark.json'), JSON.stringify(fixture, null, 2) + '\n', 'utf-8')
console.log(`fixtures/benchmark.json: ${fixture.cases.length} cases`)
for (const c of fixture.cases) {
  const o = c.expected.outcome!
  console.log(`  ${c.id}: ${o.status} @ round ${o.round} (messages=${c.expected.messages.length}, seq=${c.expected.toolCalls.at(-1)?.seq})`)
}
