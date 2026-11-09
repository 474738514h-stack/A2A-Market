# 架构说明

> 演示数据 · 脚本模拟，不调用真实大模型。

## 总览

```
┌────────────── 浏览器（Vite + React + Zustand）──────────────┐
│  BuyerWorkbench ──► sessionStore.start()                     │
│                         │ runSession(text, engineContext)    │
│                         ▼                                    │
│  src/engine（纯函数）                                         │
│   parse_requirement → broadcast_demand → match_seller        │
│     → ask_condition → negotiate(≤6 轮, make_offer)           │
│     → confirm_deal                                           │
│   guardrails.ts（断言 + 截断）  schemaValidate.ts（校验）     │
│                         │ SessionResult（完整轨迹）           │
│                         ▼                                    │
│  时间线按节拍逐条展示 → DealFlow（人工确认 → escrow.ts）       │
└──────────────────────────────────────────────────────────────┘
          ▲ 同一份 JSON                         ▲ 同一份 JSON
   config/prompts/*.json  config/schemas/*.json  mock/*.json
          ▼                                     ▼
┌────────────── eval/run_eval.py（Python 标准库）──────────────┐
│  逐行镜像引擎 → 先比对 fixtures/benchmark.json → 跑 30 条样本  │
│  → latest_report.json / failures.jsonl / runs/<taskId>/       │
└──────────────────────────────────────────────────────────────┘
```

## 状态机

`initSession` 创建状态，`stepSession(state, ctx)` 每调用一次推进一个阶段，返回新状态（先 `structuredClone` 再修改），`runSession` 循环推进到 `done`。

| 阶段 | 工具 | 终止条件 |
|---|---|---|
| parse | `parse_requirement` | 缺书名或预算 → `parse_failed` |
| broadcast | `broadcast_demand` | 没有卖家在卖这本书 → `no_match` |
| match | `match_seller` | 没有卖家满足品相要求 → `no_match` |
| inquire | `ask_condition` | 实际品相不满足 → 买家 `reject` → `condition_rejected` |
| negotiate | `make_offer` ×2/轮 | 成交 → draft；卖家报底价且超预算 ≤5% → G-BUDGET 拦截 → `over_budget`；超出更多 → `walkaway`；第 6 轮仍未成交 → G-ROUNDS → `max_rounds`；Schema 重试后仍失败 → `message_parse_failed` |
| draft | `confirm_deal` | 生成交易草案 → `deal` |

除 `deal` 外，所有结局都是 `manualReview: true`，UI 会停止自动推进，并给出「转人工确认」入口。

## 一轮议价

价格全部以「分」为整数计算。下表中 B = 预算，L = 挂牌价，F = 底价。

**买家**

- 首轮出价 = `floor(B × openingRatioPct / 100)`。
- 之后每轮出价 = `min(B, 上轮出价 + floor(B × stepPctOfBudget / 100))`。
- 卖家报价 ≤ 计划出价时直接接受。
- 卖家已报底价、且底价 ≤ B 时也接受。

**卖家**

- 计划报价 = `max(F, 上轮报价 − floor((L − F) × stepPctOfGap / 100))`。
- 买家出价 ≥ 计划报价时接受，否则按计划报价还价。

**护栏**

| 规则 | 作用 |
|---|---|
| G-SWING | 任一方单轮变动超过自身上一轮报价的 15% 时截断，并记录事件 |
| G-BUDGET | 买家价格超出预算时直接抛出 `GuardrailViolation`；任何策略或配置都无法绕过 |
| S-FLOOR | 卖家报价低于底价时同样抛出 `GuardrailViolation` |
| G-ROUNDS | 轮次超过上限时同样抛出 `GuardrailViolation` |
| G-PII | 买家输入和卖家备注在进入引擎前先过滤身份证号、手机号 |

## 结构化输出

每条消息都会经过 `message.schema.json` 校验，结果记入 `messages[].status`（`sent` / `invalid` / `blocked`）和 `errors`。校验失败时记录 `parse_error`（`stats.parseErrors`）和一条 G-SCHEMA `retry` 事件，然后重试 1 次。重试仍失败时记一条 `escalated` 事件，转人工处理。

工具输出（解析结果、品相回复、交易草案）则按 `tools.schema.json` 中对应的 `output` 校验。

`seq` 是消息、工具调用和护栏事件共用的递增序号，时间线按它合并排序。

## 单一事实源与对齐

- 前端通过 Vite 直接 import `config/` 与 `mock/` 下的 JSON，配置抽屉用 `?raw` 展示同一份文件。
- `eval/run_eval.py` 读取同一批文件；读取失败时改用脚本内嵌的副本（`--sync-embedded` 刷新）并打印警告。
- `fixtures/benchmark.json` 由 TS 生成（`npm run bench:gen`），其中记录了 6 个上下文文件的 sha256。Vitest 和 Python 都要求逐字段复现它，包括结构、精确到分的数值和终止点。

## `/eval` 报告读取

Vite 插件提供 `GET /__eval/latest_report.json`，返回 `{status: "missing" | "ready" | "invalid", report?}`，状态码始终是 200，所以浏览器控制台不会出现报错。

页面在 `missing` 时显示「待运行」，不提供运行按钮，也不会伪造结果。
