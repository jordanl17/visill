import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveSkillName } from '../src/resolve-skill-name'

describe('resolveSkillName', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'visill-resolve-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it.each([
    { packageName: 'visill-foo', expected: 'foo' },
    { packageName: 'claude-skill-bar', expected: 'bar' },
    { packageName: 'plain', expected: 'plain' },
  ])(
    'strips known prefixes from package.json#name ($packageName -> $expected)',
    async ({ packageName, expected }) => {
      writeFileSync(join(workDir, 'package.json'), JSON.stringify({ name: packageName }))
      await expect(resolveSkillName(workDir)).resolves.toBe(expected)
    },
  )

  it('throws when no package.json#name is available', async () => {
    await expect(resolveSkillName(workDir)).rejects.toThrowError(
      /^resolveSkillName: no package\.json#name at/,
    )
  })

  it('throws when package.json exists but lacks a name field', async () => {
    writeFileSync(join(workDir, 'package.json'), JSON.stringify({ version: '0.0.0' }))
    await expect(resolveSkillName(workDir)).rejects.toThrowError(
      /^resolveSkillName: no package\.json#name at/,
    )
  })
})
