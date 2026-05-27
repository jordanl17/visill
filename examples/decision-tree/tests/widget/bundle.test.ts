/**
 * Static checks against the built widget bundle.
 *
 * Catches build-config regressions that only surface in production - e.g.
 * type="module" lost (script runs before DOM), terser mangling sendPrompt
 * (silent broken Apply), or accidental bloat (~80 output tokens per KB
 * of streaming).
 *
 * Extend by editing the doubleStacheTokens / tripleStacheTokens /
 * literals arrays. Raise the size budget only with intent.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBundleTests } from '@visill/test';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
  name: string;
};
const skillName = packageJson.name.replace(/^claude-skill-/, '');
const bundlePath = resolve(__dirname, '../../skill', skillName, 'assets/widget-bundled.html');

createBundleTests({
  bundlePath,
  dataScriptId: 'navigator-data',
  doubleStacheTokens: ['topic'],
  tripleStacheTokens: ['topic_json', 'submit_instruction_json', 'tree_json'],
  literals: [
    'sendPrompt',
    'selectBranch',
    'toggleNote',
    'saveNote',
    'commitAndSubmit',
    'navigator-data',
  ],
});
