import { resolve } from 'node:path'
import { createRenderTests } from '@visill/test'

const renderPath = resolve(__dirname, '../../skill-src/scripts/render.py')

createRenderTests({
  renderPath,
  payloads: {
    'renders the hello-world greeting': { input: { name: 'world' } },
    'rejects payload missing the required name': {
      input: {},
      expectFailure: true,
      stderrContains: 'name',
    },
  },
})
