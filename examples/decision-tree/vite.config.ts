import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleSkill, defineVisillConfig, finalizeBundle, resolveSkillName } from '@visill/build';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const skillName = await resolveSkillName(repoRoot);
const skillDir = resolve(repoRoot, 'skill', skillName);
const assetsDir = resolve(skillDir, 'assets');
const skillSrcDir = resolve(repoRoot, 'skill-src');

export default defineVisillConfig({
  root: 'widget-src',
  plugins: [finalizeBundle({ outDir: assetsDir }), assembleSkill({ skillDir, skillSrcDir })],
  build: {
    outDir: assetsDir,
    rollupOptions: {
      input: resolve(repoRoot, 'widget-src/widget.html'),
    },
  },
});
