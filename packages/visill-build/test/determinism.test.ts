import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const thisDir = dirname(fileURLToPath(import.meta.url))
const fixtureDir = resolve(thisDir, 'fixtures/hello')
const builtTree = resolve(fixtureDir, 'skill/hello')
const viteBin = resolve(thisDir, '..', 'node_modules', '.bin', 'vite')

function listFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true, recursive: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort()
}

function hashTree(root: string): Record<string, string> {
  return listFiles(root).reduce<Record<string, string>>((acc, relativePath) => {
    const bytes = readFileSync(join(root, relativePath))
    acc[relativePath] = createHash('sha256').update(bytes).digest('hex')
    return acc
  }, {})
}

function runBuildAndSnapshot(): Record<string, string> {
  rmSync(builtTree, { recursive: true, force: true })
  execFileSync(viteBin, ['build'], { cwd: fixtureDir, stdio: 'pipe' })
  return hashTree(builtTree)
}

describe('hello fixture build is deterministic', () => {
  it('produces byte-identical output across two consecutive runs', () => {
    const firstRun = runBuildAndSnapshot()
    const secondRun = runBuildAndSnapshot()
    expect(secondRun).toEqual(firstRun)
  })
})
