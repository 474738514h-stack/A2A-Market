# 离线评测（eval/）

> 演示数据 · 脚本模拟，不调用真实大模型。本目录不包含任何已运行的结果；`latest_report.json`、`failures.jsonl`、`baseline.json`、`runs/` 都只会在你本地运行脚本后产生（已加入 `.gitignore`）。

## 运行

```bash
python3 eval/run_eval.py --cases eval/cases.jsonl
```

- 只依赖 Python 3.10+ 标准库。
- 脚本先做 **TS ↔ Python 基准比对**（`fixtures/benchmark.json`），不一致就以退出码 3 停止，不写任何报告。
- 比对通过后才评测 30 条样本，写出 `eval/latest_report.json`（指标 + 样本集版本 + 运行时间）和 `eval/failures.jsonl`。
- `cases.jsonl` 缺失时直接报错退出（退出码 2），不会静默跳过。需要时可以用 `--regenerate` 从脚本内嵌样本重新生成。

| 命令 | 作用 |
|---|---|
| `--bench-only` | 只跑 TS/Python 基准比对，并打印逐项比对日志（`--verbose` 显示全部差异） |
| `--rerun <taskId>` | 对该任务**冻结的样本快照**复跑，记录关联到同一个 `taskId` |
| `--mark-fixed <caseId> --task <taskId>` | 把 `open` 的失败样本标为 `fixed_pending_rerun`（声明已修，待复跑验证） |
| `--regenerate` | 用脚本内嵌的 30 条样本写出 `--cases` 文件 |
| `--sync-embedded` | 用 `config/` 与 `mock/` 刷新脚本内嵌的默认值 |

退出码：`0` 成功 · `1` 运行失败 · `2` 样本文件缺失或非法 · `3` 基准比对不一致 · `4` 复跑或标记被拒绝 · `130` 已取消（Ctrl-C）。

## 配置来源与自包含

脚本读取 `config/prompts/*.json`、`config/schemas/*.json`、`mock/books.json`、`mock/sellers.json`，和前端引擎用的是同一份文件。

- 某个文件读取失败时，改用脚本内嵌的默认值，并打印 `[warn]`。
- 文件内容与内嵌值不一致时也会打印警告，此时以文件为准。

因此只拷贝 `run_eval.py` + `cases.jsonl` 也能运行：此时基准比对标记为 `skipped`，报告的 `configSource` 会写明 `embedded`。

## TS ↔ Python 对齐（Benchmark Fixture）

`fixtures/benchmark.json` 由 `npm run bench:gen` 用 TS 引擎生成，包含 4 条参考用例：

| 用例 | 场景 |
|---|---|
| `bench-deal-seller-A` | 第 5 轮成交 |
| `bench-impasse-seller-C` | 6 轮僵局 |
| `bench-over-budget-seller-G` | 预算护栏拦截 |
| `bench-parse-fail-seller-H` | Schema 连续两次校验失败后转人工 |

两端都必须逐字段复现 `expected`：

- **结构**：对象键集合、数组长度与顺序、字符串逐字、布尔与 null 都一致。
- **数值**：价格在两端都以「分」为整数计算，除法一律对非负整数取 floor（JS `Math.floor` 与 Python `//` 等价），输出时再 `/100`。比较要求 `round(x*100)` 相等且 `|a−b| < 1e-9`。JSON 只有一种数字类型，`19` 与 `19.0` 视为相等。
- **终止点**：`outcome.status@round`、消息条数、护栏事件条数、最后一个 `seq` 与 `stats` 一致。

fixture 里记录了生成时 6 个配置/Mock 文件的 sha256。文件改动后，TS 单测和 Python 都会提示 fixture 过期。

## 指标定义（metrics-v1.0.0）

| 指标 | 定义 | 目标 |
|---|---|---|
| 协商成功率 | 成交会话数 ÷ 进入议价（已匹配到卖家）的会话数 | ≥70% [待验证] |
| 平均协商轮次 | 成交会话 `stats.rounds` 的平均值 | ≤5 轮 [待验证] |
| 成交价与预算偏差 | 成交会话 \|成交价 − 预算\| ÷ 预算 的平均值（报告同时给出元的绝对值均值） | ≤10% [待验证] |
| 护栏触发率 | 至少触发 1 次护栏事件（G-PII / G-SWING / G-BUDGET / G-ROUNDS / G-SCHEMA）的会话数 ÷ 全部会话数 | ≤15% [待验证] |
| 结构化输出解析成功率 | 通过 `message.schema.json` 校验的消息数 ÷ 生成的消息总数（含重试） | ≥95% [待验证] |

目标值必须由你本地实跑后确认，脚本、UI 与 README 一律标注 **[待验证]**，不会自动判定「达成」。

辅助信息（不计入上表）：`casePassRate` 是样本结局符合 `expected` 的比例，`outcomeBreakdown` 是各结局的分布。

## 样本（cases-v1.0.0）

`cases.jsonl` 每行一条，格式如下：

```json
{"caseId": "c01", "datasetVersion": "cases-v1.0.0", "input": "…", "expected": {"outcome": "deal", "sellerId": "seller_A", "guardrails": []}, "tags": ["预算充足"]}
```

判定规则：`outcome` 必须相等；给了 `sellerId` 时必须命中该卖家；`guardrails` 里列出的规则都必须触发过（允许额外触发）。`expected` 按设计意图人工标注，不是从引擎输出反推出来的。

## 任务、复跑与失败状态

**任务与快照**

- 每次新运行生成一个 `taskId`（`eval-<本地时间>-<样本哈希前 6 位>`）。
- 样本会冻结到 `runs/<taskId>/cases.snapshot.jsonl`，并在 `task.json` 中记录哈希。
- 之后所有复跑都基于这份冻结样本，并追加到同一个 `task.json` 的 `runs` 里。

**未完成或取消不推进**

- 运行中途被取消或失败时，只在 `task.json` 里记 `cancelled`/`failed`。
- 这种情况不写 `latest_report.json` / `failures.jsonl`，也不会沿用旧列表。
- 首次运行没有成功的任务，拒绝复跑。

**失败样本的状态**

| 状态 | 怎么进入 |
|---|---|
| `open` | 复跑仍失败、或新出现的失败 |
| `fixed_pending_rerun` | 人工执行 `--mark-fixed` |
| `fixed` | **只有**复跑通过才会进入 |

已 `fixed` 的样本如果复跑再次失败，会回到 `open`。脚本不提供手动「完成复跑」的动作。

**失败列表的来源**：`failures.jsonl` 只来自该任务冻结样本的实际结果。

## 历史比较（基线）

- **基线键**：`样本集版本 | 样本哈希 | 指标定义版本`，三者都相同才可比较。
- **首个成功运行**：只建立基线（`comparison.status = baseline_established`），不计算差异。
- **之后的成功运行**：与该基线比较，给出各指标的 `deltas`。
- 不会按运行次数，或按任何预置的历史数据计算差异。
