import { describe } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBundleTests } from '../src/bundle'

const currentDir = dirname(fileURLToPath(import.meta.url))
const bundlePath = resolve(currentDir, 'fixtures/bundles/missing-literal.html')

describe('createBundleTests without literals option', () => {
  createBundleTests({
    bundlePath,
    doubleStacheTokens: ['topic'],
    tripleStacheTokens: ['topic_json'],
    dataScriptId: 'test-data',
  })
})
