# @visill/build

Vite plugins that assemble visill widget skills into a shippable `skill/<name>/` tree.

## Install

```sh
pnpm add -D @visill/build vite vite-plugin-singlefile lightningcss terser
```

All four are peer dependencies.

## Usage

A consumer `vite.config.ts`:

```ts
import {
  assembleSkill,
  defineVisillConfig,
  finalizeBundle,
  resolveSkillName,
} from '@visill/build'
import { resolve } from 'node:path'

const skillName = await resolveSkillName(import.meta.dirname)
const skillDir = resolve(import.meta.dirname, 'skill', skillName)

export default defineVisillConfig({
  root: 'widget-src',
  plugins: [finalizeBundle(), assembleSkill({ skillDir, skillSrcDir: resolve(import.meta.dirname, 'skill-src') })],
  build: { outDir: resolve(skillDir, 'assets') },
})
```

## API

| Export | Purpose |
| --- | --- |
| `defineVisillConfig(userConfig?)` | Wraps Vite's `defineConfig` with the visill baseline (Vite singlefile, terser, lightningcss, `base: './'`, `emptyOutDir: false`, `modulePreload: false`). Shallow-merges user `build`, concatenates user `plugins`. |
| `finalizeBundle(options?)` | Vite plugin. Rewrites the inlined `widget.html` to `widget-bundled.html`: strips `crossorigin` and stray `rel="stylesheet"`, collapses blank lines, preserves `type="module"`. Optional `sizeLimit` rejects oversize bundles. |
| `assembleSkill({ skillDir, skillSrcDir, slotToken?, extras? })` | Vite plugin. Writes `SKILL.md` with the `{{SCHEMA}}` slot replaced by a fenced JSON block, plus `assets/schema.json`, `scripts/`, `references/`, and `LICENSE` into `skillDir`. `extras` accepts arbitrary `{ from, to, executable? }` entries. |
| `resolveSkillName(repoRoot)` | Async. Returns the skill folder name. Precedence: `visill.config.ts` export, then `package.json#name` with `visill-` or `claude-skill-` stripped, then throw. |

## Design notes

- [ADR 0010 - finalizeBundle HTML rewrites](../../docs/adrs/0010-finalize-bundle-html-rewrites.md)
- [ADR 0011 - Skill-name resolution](../../docs/adrs/0011-skill-name-resolution.md)
