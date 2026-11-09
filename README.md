# A2A 二手书协商代理 · Web MVP Demo

> **演示数据 · 脚本模拟，不调用真实大模型。** 所有「AI」行为都是前端里的确定性脚本，书目、卖家、价格均为虚构；托管与放款只是界面上的模拟流程，不产生任何真实支付。

## 这个 Demo 是什么

买家用一句话说出购书需求，系统先把它解析成结构化需求，再匹配模拟的卖家 Agent。接着买卖双方 Agent 按统一的 JSON 协议议价，最多 6 轮。谈成会生成交易草案，你确认后走完一遍「资金托管 → 卖家发货 → 确认收货 → 放款」的模拟托管闭环。

页面会展示链路上的每个关键步骤：

- 解析出的字段（原文中命中处高亮）和每个字段的置信度
- 匹配评分（品相 / 价格 / 信誉三项）
- 每一轮的 intent、价格、品相和理由
- 每条消息对应的工具名，以及来源（Prompt 版本 + 规则 id）
- 护栏拦截的原因
- 交易草案，以及评测说明

| 页面 | 内容 |
|---|---|
| `/` 找书议价 | 需求输入与一键演示 → ① 需求解析 → ② 卖家匹配 → ③ 协商时间线 → 结局卡 |
| `/deal` 交易托管 | 交易草案 → 确认 → 托管四步 → 完成动画；异常时显示原因和「转人工确认」 |
| `/eval` 评测说明 | 只读：评测口径与指标定义；本地跑过脚本时展示 `eval/latest_report.json`，否则显示「待运行」 |
| Prompt 配置抽屉 | 在工作台点「查看 Prompt 配置」打开，只读展示 `config/prompts/*.json` 与 `config/schemas/*.json`，可以复制、下载 |

## 本地运行

需要 Node.js 20+ 和 Python 3.10+，无需任何环境变量或 API Key，断网也能运行。

```bash
npm i && npm run dev        # 开发服务器 http://127.0.0.1:5287
npm test                    # Vitest：协商引擎、护栏、TS 基准 fixture、配置元数据
python3 eval/run_eval.py    # 离线评测（先做 TS↔Python 基准比对，再跑 30 条样本）
```

其他脚本：

| 命令 | 作用 |
|---|---|
| `npm run build` | 类型检查并构建 |
| `npm run bench:gen` | 改了引擎或配置后，重新生成 `fixtures/benchmark.json` |
| `npm run eval` | 等价于 `python3 eval/run_eval.py --cases eval/cases.jsonl` |

本次代码里没有接入任何真实服务，也不读取 `VITE_USE_REAL_LLM`。日后接入真实服务时，预留的变量名是 `VITE_API_BASE`（本次未使用）。

## 3 分钟演示脚本

1. **成交（约 60 秒）**
   - 在首页点「预算充足 · 成交」，再点「开始找书」。
   - 依次看到：需求解析的高亮和置信度；匹配到 `seller_A`（信誉高、挂牌价 26 元，底价不展示）；买家先询问品相 `ask_condition`；之后 5 轮 `make_offer`，最终以 19 元成交。
   - 点「去确认交易」→「确认交易」，按四步走完托管，出现完成动画。
2. **僵局（约 30 秒）**：点「预算偏低 · 僵局」。强硬的 `seller_C` 底价高于预算，谈满 6 轮后出现 G-ROUNDS 提示条，并显示「转人工确认」。
3. **护栏（约 45 秒）**
   - 「敏感信息 · 护栏」：你的手机号和卖家备注里的手机号都会被隐藏。
   - 展开「异常演示」：
     - 「超预算拦截」：卖家底价 104 元高于预算 100 元，买家 Agent 想接受，被 G-BUDGET 拦截，那条消息带删除线、标注未发送。
     - 「消息解析失败」：卖家消息没通过 Schema 校验，重试一次仍失败，转人工。
     - 「超 6 轮」：另一位强硬卖家，同样谈满 6 轮后停止。
4. **配置与评测（约 45 秒）**
   - 打开「查看 Prompt 配置」，可以看到版本号、changelog 和原文。
   - 改 `config/prompts/buyer.json` 里的 `openingRatioPct` 后刷新，首轮出价会随之变化。
   - 打开 `/eval` 看评测口径；本地运行 `python3 eval/run_eval.py` 后刷新，即可看到运行时间、样本版本和各项指标，目标值一律标注 [待验证]。

## 目录结构

```
config/prompts/      buyer.json / seller.json：版本、changelog、让步参数、话术模板
config/schemas/      message.schema.json / tools.schema.json：前端与 Python 共用的单一事实源
mock/                books.json / sellers.json（10 个卖家 Agent）/ demo-presets.json
src/engine/          纯函数引擎：negotiationEngine（状态机）、tools、guardrails、schemaValidate、escrow
src/pages/           BuyerWorkbench / DealFlow / EvalInfo
src/components/      需求表单、解析卡、匹配卡、时间线、气泡、护栏条、草案、托管步骤、配置抽屉
src/store/           Zustand 会话状态（sessionStorage 持久化）与时间线节拍
fixtures/            benchmark.json：TS 生成、Python 必须逐字段复现的基准用例
eval/                run_eval.py（标准库、自包含）、cases.jsonl（30 条）、README（指标与复跑约定）
docs/                architecture.md / design-decisions.md
```

## 后续要求（本次不做）

P1：

- 多卖家并行比价视图
- 卖家信誉分可视化

P2：

- 接入真实大模型（解析与话术生成）及其成本、延迟监控
- 数据库与会话持久化
- 真实第三方托管与支付
- 卖家信誉体系
- 持续评测流水线（CI 中跑基准比对与样本评测）
- 灰度发布与 A/B 实验
- 权限与隐私（账号体系、数据脱敏策略、审计）
