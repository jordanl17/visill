import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const thisDir = dirname(fileURLToPath(import.meta.url))
const fixtureDir = resolve(thisDir, 'fixtures/hello')
const builtTree = resolve(fixtureDir, 'skill/hello')
const goldenTree = resolve(thisDir, 'fixtures/hello.golden/skill/hello')
const viteBin = resolve(thisDir, '..', 'node_modules', '.bin', 'vite')

function listFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true, recursive: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort()
}

describe('hello fixture build', () => {
  beforeAll(() => {
    rmSync(builtTree, { recursive: true, force: true })
    execFileSync(viteBin, ['build'], { cwd: fixtureDir, stdio: 'pipe' })
  })

  it('produces the same file set as the golden tree', () => {
    expect(listFiles(builtTree)).toEqual(listFiles(goldenTree))
  })

  it('produces byte-identical output for every file except the bundled widget', () => {
    const goldenFiles = listFiles(goldenTree).filter(
      (relativePath) => relativePath !== 'assets/widget-bundled.html',
    )
    goldenFiles.forEach((relativePath) => {
      const builtBytes = readFileSync(join(builtTree, relativePath))
      const goldenBytes = readFileSync(join(goldenTree, relativePath))
      expect(builtBytes.equals(goldenBytes)).toBe(true)
    })
  })

  describe('widget-bundled.html', () => {
    const widgetPath = join(builtTree, 'assets/widget-bundled.html')

    it('exists and contains an inline module script', () => {
      const html = readFileSync(widgetPath, 'utf8')
      expect(html).toMatch(/<script\s+type="module">/)
    })

    it('does not contain crossorigin', () => {
      const html = readFileSync(widgetPath, 'utf8')
      expect(html).not.toContain('crossorigin')
    })

    it('does not contain a stylesheet rel attribute on inlined style tags', () => {
      const html = readFileSync(widgetPath, 'utf8')
      expect(html).not.toMatch(/<style[^>]*rel="stylesheet"/)
    })

    it('stays under 50kb', () => {
      const html = readFileSync(widgetPath, 'utf8')
      expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(50_000)
    })
  })
})
