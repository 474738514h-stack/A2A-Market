import { useState } from 'react'
import { exceptionPresets, presets, type DemoPreset } from '../data/loader'
import { Card, CardHeader } from './ui/Card'

const HINT_CHIPS = ['书名用《》', '几成新', '有无笔记', '预算多少元']

function Chip({ preset, active, onPick }: { preset: DemoPreset; active: boolean; onPick: (p: DemoPreset) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(preset)}
      className={`press rounded-full border px-3 py-1.5 text-aux font-semibold ${
        active ? 'border-primary bg-primary text-white' : 'border-line bg-bg text-ink hover:border-primary'
      }`}
    >
      {preset.label}
    </button>
  )
}

export function DemandForm({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (text: string) => void
  disabled?: boolean
}) {
  const [showExceptions, setShowExceptions] = useState(false)
  const pick = (p: DemoPreset) => onChange(p.text)

  return (
    <Card>
      <CardHeader title="说说你想要的书" hint="买家 Agent 会先把你的话整理成结构化需求，再去找卖家。" />
      <label htmlFor="demand" className="sr-only">
        购书需求
      </label>
      <textarea
        id="demand"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="例如：帮我找一本 9 成新、无笔记的《人类简史》，预算 20 元"
        className="w-full resize-none rounded-2xl border border-line bg-bg px-4 py-3 text-body text-ink outline-none transition-shadow duration-200 ease-spring placeholder:text-muted focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] disabled:opacity-60"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {HINT_CHIPS.map((h) => (
          <span key={h} className="rounded-full bg-primary-soft px-2 py-0.5 text-aux text-primary-ink">
            {h}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-aux font-semibold text-muted">一键演示</div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Chip key={p.id} preset={p} active={value === p.text} onPick={pick} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowExceptions((v) => !v)}
          className="press mt-3 text-aux font-semibold text-muted hover:text-primary-ink"
          aria-expanded={showExceptions}
        >
          {showExceptions ? '收起异常演示 ▲' : '异常演示（超预算 / 超 6 轮 / 消息解析失败）▼'}
        </button>
        {showExceptions && (
          <div className="fade-in mt-2 flex flex-wrap gap-2">
            {exceptionPresets.map((p) => (
              <Chip key={p.id} preset={p} active={value === p.text} onPick={pick} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
