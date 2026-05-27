import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(currentDir, 'fixtures/bundles')

const sizeLimit = 16_384

const assertions = [
  {
    name: 'typeModulePresent',
    evaluate: (bundle: string) => /<script\s+type="module">/.test(bundle),
  },
  {
    name: 'noBareScript',
    evaluate: (bundle: string) =>
      /<script>\s*(?:var|const|let|function|document)/.test(bundle) === false,
  },
  {
    name: 'topicToken',
    evaluate: (bundle: string) => bundle.includes('{{topic}}'),
  },
  {
    name: 'topicJsonToken',
    evaluate: (bundle: string) => bundle.includes('{{{topic_json}}}'),
  },
  {
    name: 'dataIsland',
    evaluate: (bundle: string) =>
      /<script\s+id="test-data"\s+type="application\/json">/.test(bundle),
  },
  {
    name: 'sendPromptLiteral',
    evaluate: (bundle: string) => bundle.includes('sendPrompt'),
  },
  {
    name: 'sizeBudget',
    evaluate: (bundle: string) => bundle.length < sizeLimit,
  },
] as const

const fixtures = [
  { file: 'missing-type-module.html', targetIndex: 0 },
  { file: 'oversized.html', targetIndex: 6 },
  { file: 'missing-token.html', targetIndex: 2 },
  { file: 'missing-literal.html', targetIndex: 5 },
] as const

fixtures.forEach((fixture) => {
  describe(`fixture: ${fixture.file}`, () => {
    const bundle = readFileSync(resolve(fixturesDir, fixture.file), 'utf8')
    const results = assertions.map((assertion) => assertion.evaluate(bundle))

    assertions.forEach((assertion, assertionIndex) => {
      const expectedPass = assertionIndex !== fixture.targetIndex
      const label = expectedPass ? 'passes' : 'fails'
      it(`${label} the ${assertion.name} assertion`, () => {
        expect(results[assertionIndex]).toBe(expectedPass)
      })
    })
  })
})
