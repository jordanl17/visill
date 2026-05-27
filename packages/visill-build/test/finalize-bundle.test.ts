import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { finalizeBundle } from '../src/finalize-bundle'

interface PluginWithWriteBundle {
  writeBundle: (options: { dir: string }) => void
}

const pluginContext = {
  info: () => undefined,
}

function invoke(plugin: unknown, outDir: string): void {
  const cast = plugin as PluginWithWriteBundle
  cast.writeBundle.call(pluginContext, { dir: outDir })
}

describe('finalizeBundle', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'visill-finalize-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it('throws with actual and limit bytes when sizeLimit is exceeded', () => {
    const oversize = '<html>'.padEnd(200, 'x')
    writeFileSync(join(workDir, 'widget.html'), oversize, 'utf8')
    const plugin = finalizeBundle({ sizeLimit: 50 })
    expect(() => invoke(plugin, workDir)).toThrowError(
      /finalize-bundle: \d+ bytes exceeds limit 50 bytes/,
    )
  })

  it('does not write the target or delete the source when sizeLimit is exceeded', () => {
    const oversize = '<html>'.padEnd(200, 'x')
    writeFileSync(join(workDir, 'widget.html'), oversize, 'utf8')
    const plugin = finalizeBundle({ sizeLimit: 50 })
    expect(() => invoke(plugin, workDir)).toThrow()
    expect(() => writeFileSync(join(workDir, 'widget.html'), oversize)).not.toThrow()
  })

  it('passes when bundle size is under the limit', () => {
    writeFileSync(join(workDir, 'widget.html'), '<html></html>', 'utf8')
    const plugin = finalizeBundle({ sizeLimit: 1000 })
    expect(() => invoke(plugin, workDir)).not.toThrow()
  })
})
