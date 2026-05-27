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

  it('returns the named export from visill.config.ts when present', async () => {
    writeFileSync(join(workDir, 'visill.config.ts'), `export const name = 'override-named'\n`)
    await expect(resolveSkillName(workDir)).resolves.toBe('override-named')
  })

  it('falls back to the default export name when no named export exists', async () => {
    writeFileSync(
      join(workDir, 'visill.config.ts'),
      `export default { name: 'override-default' }\n`,
    )
    await expect(resolveSkillName(workDir)).resolves.toBe('override-default')
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

  it('throws when neither visill.config.ts nor package.json#name is available', async () => {
    await expect(resolveSkillName(workDir)).rejects.toThrowError(
      /^resolveSkillName: no visill\.config\.ts and no package\.json#name at/,
    )
  })

  it('throws when package.json exists but lacks a name field', async () => {
    writeFileSync(join(workDir, 'package.json'), JSON.stringify({ version: '0.0.0' }))
    await expect(resolveSkillName(workDir)).rejects.toThrowError(
      /^resolveSkillName: no visill\.config\.ts and no package\.json#name at/,
    )
  })

  it('prefers visill.config.ts over package.json when both are present', async () => {
    writeFileSync(join(workDir, 'visill.config.ts'), `export const name = 'override'\n`)
    writeFileSync(join(workDir, 'package.json'), JSON.stringify({ name: 'visill-foo' }))
    await expect(resolveSkillName(workDir)).resolves.toBe('override')
  })
})
