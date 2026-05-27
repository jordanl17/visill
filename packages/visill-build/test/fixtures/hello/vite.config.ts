import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assembleSkill,
  defineVisillConfig,
  finalizeBundle,
  resolveSkillName,
} from '../../../src/index'

const fixtureRoot = dirname(fileURLToPath(import.meta.url))
const skillName = await resolveSkillName(fixtureRoot)
const skillDir = resolve(fixtureRoot, 'skill', skillName)
const assetsDir = resolve(skillDir, 'assets')

export default defineVisillConfig({
  root: 'widget-src',
  plugins: [
    finalizeBundle(),
    assembleSkill({
      skillDir,
      skillSrcDir: resolve(fixtureRoot, 'skill-src'),
    }),
  ],
  build: {
    outDir: assetsDir,
    rollupOptions: {
      input: resolve(fixtureRoot, 'widget-src/widget.html'),
    },
  },
})
