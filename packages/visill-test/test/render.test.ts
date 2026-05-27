import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRenderTests } from '../src/render'

const currentDir = dirname(fileURLToPath(import.meta.url))
const renderPath = resolve(currentDir, 'fixtures/render/render.py')

createRenderTests({
  renderPath,
  payloads: {
    'valid topic': {
      input: { topic: 'hello world' },
    },
    'missing topic rejected': {
      input: {},
      expectFailure: true,
      stderrContains: "missing required property 'topic'",
    },
  },
})
