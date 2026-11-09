import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))
const REPORT_ROUTE = '/__eval/latest_report.json'
const REPORT_FILE = path.join(root, 'eval', 'latest_report.json')

// Serves the locally generated eval report read-only as { status, report }. A missing file
// is { status: "missing" } (HTTP 200, so the browser console stays clean) and the /eval page
// renders "待运行" — the UI never fabricates results.
function evalReportPlugin(): Plugin {
  const handler = (req: { url?: string }, res: import('node:http').ServerResponse, next: () => void) => {
    if (!req.url || req.url.split('?')[0] !== REPORT_ROUTE) return next()
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (!fs.existsSync(REPORT_FILE)) {
      res.end(JSON.stringify({ status: 'missing' }))
      return
    }
    const text = fs.readFileSync(REPORT_FILE, 'utf-8')
    try {
      res.end(JSON.stringify({ status: 'ready', report: JSON.parse(text) }))
    } catch {
      res.end(JSON.stringify({ status: 'invalid', message: 'eval/latest_report.json 不是合法 JSON' }))
    }
  }
  return {
    name: 'eval-report-readonly',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig({
  plugins: [react(), evalReportPlugin()],
  resolve: {
    alias: {
      '@config': path.join(root, 'config'),
      '@mock': path.join(root, 'mock'),
      '@fixtures': path.join(root, 'fixtures'),
    },
  },
  server: { port: 5287, strictPort: true, host: '127.0.0.1' },
  preview: { port: 5288, strictPort: true, host: '127.0.0.1' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
