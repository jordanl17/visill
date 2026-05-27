import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, sep } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plugin } from 'vite'
import { defineVisillConfig } from '../src/define-visill-config'

interface NamedPlugin {
  name: string
}

function pluginNames(plugins: unknown): string[] {
  if (Array.isArray(plugins)) {
    return plugins
      .filter((entry): entry is NamedPlugin => {
        return typeof entry === 'object' && entry !== null && 'name' in entry
      })
      .map((entry) => entry.name)
  }
  return []
}

describe('defineVisillConfig', () => {
  let workDir: string
  let cwdSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'visill-define-'))
    writeFileSync(join(workDir, 'package.json'), JSON.stringify({ name: 'visill-hello' }))
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(workDir)
  })

  afterEach(() => {
    cwdSpy.mockRestore()
    rmSync(workDir, { recursive: true, force: true })
  })

  it('returns a fully-formed config with skill-aware defaults', async () => {
    const config = await defineVisillConfig({})

    expect(config.root).toBe('widget-src')

    const outDir = config.build?.outDir
    expect(typeof outDir).toBe('string')
    expect(isAbsolute(outDir as string)).toBe(true)
    expect((outDir as string).endsWith(join('skill', 'hello', 'assets'))).toBe(true)

    const input = config.build?.rollupOptions?.input
    expect(typeof input).toBe('string')
    expect(isAbsolute(input as string)).toBe(true)
    expect((input as string).endsWith(join('widget-src', 'widget.html'))).toBe(true)

    expect(Array.isArray(config.plugins)).toBe(true)
    expect(config.plugins).toHaveLength(3)
    expect(pluginNames(config.plugins)).toEqual([
      'vite:singlefile',
      'visill:finalize-bundle',
      'visill:assemble-skill',
    ])
  })

  it('lets the user override the default root', async () => {
    const config = await defineVisillConfig({ root: 'custom-widget-src' })
    expect(config.root).toBe('custom-widget-src')
  })

  it('lets the user override the default build.outDir', async () => {
    const config = await defineVisillConfig({ build: { outDir: '/tmp/custom-out' } })
    expect(config.build?.outDir).toBe('/tmp/custom-out')
  })

  it('lets the user override the default rollup input', async () => {
    const config = await defineVisillConfig({
      build: { rollupOptions: { input: '/tmp/custom.html' } },
    })
    expect(config.build?.rollupOptions?.input).toBe('/tmp/custom.html')
  })

  it('appends user plugins after the defaults in declaration order', async () => {
    const userPluginA: Plugin = { name: 'user-a' }
    const userPluginB: Plugin = { name: 'user-b' }
    const config = await defineVisillConfig({ plugins: [userPluginA, userPluginB] })

    expect(config.plugins).toHaveLength(5)
    expect(pluginNames(config.plugins)).toEqual([
      'vite:singlefile',
      'visill:finalize-bundle',
      'visill:assemble-skill',
      'user-a',
      'user-b',
    ])
  })

  it("preserves base: './' under a partial user override", async () => {
    const config = await defineVisillConfig({ define: { __FOO__: '1' } })
    expect(config.base).toBe('./')
    expect(config.define?.__FOO__).toBe('1')
  })

  it('shallow-merges build.rollupOptions so unrelated user keys do not drop the default input', async () => {
    const config = await defineVisillConfig({
      build: { rollupOptions: { treeshake: false } },
    })

    const input = config.build?.rollupOptions?.input
    expect(typeof input).toBe('string')
    expect((input as string).endsWith(`widget-src${sep}widget.html`)).toBe(true)
    expect(config.build?.rollupOptions?.treeshake).toBe(false)
  })
})
