import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

export interface BundleTestOptions {
  bundlePath: string
  skillName?: string
  doubleStacheTokens?: readonly string[]
  tripleStacheTokens?: readonly string[]
  literals?: readonly string[]
  dataScriptId: string
  dataScriptType?: string
  sizeLimit?: number
}

export const createBundleTests = (options: BundleTestOptions): void => {
  const {
    bundlePath,
    doubleStacheTokens = [],
    tripleStacheTokens = [],
    literals = [],
    dataScriptId,
    dataScriptType = 'application/json',
    sizeLimit = 16_384,
  } = options

  const bundle = readFileSync(bundlePath, 'utf8')
  const sizeLimitKb = Math.floor(sizeLimit / 1024)
  const sizeLimitFormatted = sizeLimit.toLocaleString('en-US')

  describe('bundle integrity', () => {
    describe('script execution timing', () => {
      it('the inlined <script> declares type="module" so it defers past DOM parsing', () => {
        expect(bundle).toMatch(/<script\s+type="module">/)
      })

      it('does NOT contain a bare <script> without attributes (legacy non-deferred pattern)', () => {
        expect(bundle).not.toMatch(/<script>\s*(?:var|const|let|function|document)/)
      })
    })

    describe('runtime slot tokens preserved (filled by render.py at skill runtime)', () => {
      doubleStacheTokens.forEach((token) => {
        it(`{{${token}}} is present in the bundled HTML`, () => {
          expect(bundle).toContain(`{{${token}}}`)
        })
      })

      tripleStacheTokens.forEach((token) => {
        it(`{{{${token}}}} is present in the bundled HTML`, () => {
          expect(bundle).toContain(`{{{${token}}}}`)
        })
      })

      it(`inline ${dataScriptId} <script type="${dataScriptType}"> tag is present`, () => {
        const dataIslandPattern = new RegExp(
          `<script\\s+id="${dataScriptId}"\\s+type="${dataScriptType.replace(/\//g, '\\/')}">`,
        )
        expect(bundle).toMatch(dataIslandPattern)
      })
    })

    describe('critical string literals survive JS minification', () => {
      literals.forEach((literal) => {
        it(`"${literal}" appears in the bundled output`, () => {
          expect(bundle).toContain(literal)
        })
      })
    })

    describe('size budget', () => {
      it(`bundle stays under ${sizeLimitKb} KB (${sizeLimitFormatted} bytes)`, () => {
        expect(bundle.length).toBeLessThan(sizeLimit)
      })
    })
  })
}
