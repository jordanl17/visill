import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dtsPath = resolve(here, '..', 'dist', 'index.d.ts')

function readPublicSurface(): string {
  const raw = readFileSync(dtsPath, 'utf-8')
  const withoutSourceMap = raw.replace(/^\s*\/\/# sourceMappingURL=.*$/m, '')
  return withoutSourceMap.trim().replace(/\n{3,}/g, '\n\n')
}

describe('public-api surface (dist/index.d.ts snapshot)', () => {
  test('matches the locked public surface', () => {
    expect(readPublicSurface()).toMatchInlineSnapshot(`
      "export { sendPrompt } from './host';
      export { readyDOM } from './ready-dom';
      export { requireElement } from './require-element';
      export { ownDescendant } from './own-descendant';
      export { delegate } from './delegate';
      export { readDataIsland } from './data-island';
      export { buildPrompt } from './prompt';"
    `)
  })
})
