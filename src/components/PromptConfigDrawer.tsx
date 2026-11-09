import { useState } from 'react'
import buyerRaw from '@config/prompts/buyer.json?raw'
import sellerRaw from '@config/prompts/seller.json?raw'
import messageSchemaRaw from '@config/schemas/message.schema.json?raw'
import toolsSchemaRaw from '@config/schemas/tools.schema.json?raw'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Drawer } from './ui/Drawer'

interface ConfigFile {
  path: string
  label: string
  raw: string
}

const FILES: ConfigFile[] = [
  { path: 'config/prompts/buyer.json', label: '买家 Prompt', raw: buyerRaw },
  { path: 'config/prompts/seller.json', label: '卖家 Prompt', raw: sellerRaw },
  { path: 'config/schemas/message.schema.json', label: '消息 Schema', raw: messageSchemaRaw },
  { path: 'config/schemas/tools.schema.json', label: '工具 Schema', raw: toolsSchemaRaw },
]

interface Meta {
  version?: string
  effectiveDate?: string
  changelog?: Array<{ version: string; date: string; changes: string[] }>
}

function download(file: ConfigFile) {
  const blob = new Blob([file.raw], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.path.split('/').pop()!
  a.click()
  URL.revokeObjectURL(url)
}

export function PromptConfigDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)
  const file = FILES[active]
  let meta: Meta = {}
  try {
    meta = JSON.parse(file.raw) as Meta
  } catch {
    meta = {}
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(file.raw)
      setCopied(file.path)
    } catch {
      setCopied('failed')
    }
    window.setTimeout(() => setCopied(null), 1600)
  }

  return (
    <Drawer open={open} onClose={onClose} title="Prompt 与 Schema 配置（只读）">
      <p className="text-aux text-muted">
        这些文件就是引擎实际读取的配置，改动请走 Git 提交；这里只读展示，不提供编辑。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="tablist">
        {FILES.map((f, i) => (
          <button
            key={f.path}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`press rounded-2xl border px-3 py-2 text-left text-aux font-semibold ${
              i === active ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line bg-bg text-ink'
            }`}
          >
            {f.label}
            <span className="block truncate font-mono text-[11px] font-normal text-muted">{f.path.split('/').pop()}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="primary">v{meta.version ?? '?'}</Badge>
        {meta.effectiveDate && <Badge tone="outline">生效 {meta.effectiveDate}</Badge>}
        <span className="min-w-0 flex-1 truncate font-mono text-aux text-muted">{file.path}</span>
      </div>

      {meta.changelog && (
        <div className="mt-3 rounded-2xl bg-surface p-3 border border-line">
          <div className="text-aux font-bold text-ink">changelog</div>
          <ul className="mt-1 space-y-1 text-aux text-muted">
            {meta.changelog.map((c) => (
              <li key={c.version}>
                <span className="font-semibold text-ink">
                  {c.version} · {c.date}
                </span>{' '}
                {c.changes.join('；')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="soft" size="sm" onClick={copy}>
          {copied === file.path ? '已复制' : copied === 'failed' ? '复制失败，请手动选择' : '复制'}
        </Button>
        <Button variant="soft" size="sm" onClick={() => download(file)}>
          下载
        </Button>
      </div>
      <pre className="mt-3 max-h-[46dvh] overflow-auto rounded-2xl bg-ink p-4 font-mono text-[12px] leading-5 text-bg" style={{ backgroundColor: 'var(--text)' }}>
        {file.raw}
      </pre>
    </Drawer>
  )
}
