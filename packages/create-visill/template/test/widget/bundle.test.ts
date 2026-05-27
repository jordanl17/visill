import { createBundleTests } from '@visill/test'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const skillRoot = resolve(__dirname, '../../skill')
const entries = readdirSync(skillRoot)
const skillName = entries[0]
if (skillName === undefined) {
  throw new Error(`No built skill found under ${skillRoot}. Run pnpm build first.`)
}
const bundlePath = resolve(skillRoot, skillName, 'assets', 'widget-bundled.html')

createBundleTests({
  bundlePath,
  dataScriptId: 'root-data',
})
