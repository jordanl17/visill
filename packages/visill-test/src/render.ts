import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

export type RenderPayload = {
  input: unknown
  expectFailure?: boolean
  stderrContains?: string
}

export type CreateRenderTestsOptions = {
  renderPath: string
  payloads: Record<string, RenderPayload>
  snapshotDir?: string
}

const pythonProbe = spawnSync('python3', ['--version'], { encoding: 'utf8' })
if (pythonProbe.status !== 0) {
  throw new Error('python3 not found on PATH; install Python 3 to run @visill/test render tests')
}

export const createRenderTests = (options: CreateRenderTestsOptions): void => {
  const { renderPath, payloads, snapshotDir } = options

  describe('render.py', () => {
    Object.entries(payloads).forEach(([name, payload]) => {
      it(name, async () => {
        const result = spawnSync('python3', [renderPath], {
          input: JSON.stringify(payload.input),
          encoding: 'utf8',
        })

        if (payload.expectFailure === true) {
          expect(result.status).toBeGreaterThan(0)
          if (typeof payload.stderrContains === 'string') {
            expect(result.stderr).toContain(payload.stderrContains)
          }
          return
        }

        expect(result.status).toBe(0)
        if (typeof snapshotDir === 'string') {
          await expect(result.stdout).toMatchFileSnapshot(join(snapshotDir, `${name}.html`))
        }
      })
    })
  })
}
