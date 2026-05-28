import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(currentDir, '../scripts/structural-html-diff.mjs')
const fixturesDir = resolve(currentDir, 'fixtures/structural-html-diff')

const runScript = (args: string[]) => spawnSync('node', [scriptPath, ...args], { encoding: 'utf8' })

describe('structural-html-diff', () => {
  it('exits 0 when two widgets differ only in cosmetic ways', () => {
    const result = runScript([
      resolve(fixturesDir, 'widget-a.html'),
      resolve(fixturesDir, 'widget-b.html'),
    ])
    expect(result.status).toBe(0)
  })

  it('exits 1 and names the differing region when module-script bodies diverge', () => {
    const result = runScript([
      resolve(fixturesDir, 'widget-a.html'),
      resolve(fixturesDir, 'widget-c.html'),
    ])
    expect(result.status).toBe(1)
    const combinedOutput = `${result.stdout}${result.stderr}`
    expect(combinedOutput).toContain('module-script')
  })

  it('exits 2 when invoked with no arguments', () => {
    const result = runScript([])
    expect(result.status).toBe(2)
  })
})
