import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRenderTests } from '@visill/test'

const prefixes = ['visill-', 'claude-skill-']

const stripPrefix = (name: string): string => {
  const matched = prefixes.find((prefix) => name.startsWith(prefix))
  return matched ? name.slice(matched.length) : name
}

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
  name: string
}
const skillName = stripPrefix(packageJson.name)
const renderPath = resolve(__dirname, '../../skill', skillName, 'scripts/render.py')

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
