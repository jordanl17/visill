/**
 * jsdom runtime tests for the decision-tree navigator widget.
 *
 * jsdom does not execute <script type="module"> natively, so we extract
 * the script body and re-inject it as a plain <script> element appended
 * to the document. jsdom runs this in its own window realm, distinct
 * from the test's document.defaultView - sendPrompt calls are routed
 * through `document` (the shared object) so the spy can observe them.
 *
 * Slot filling is delegated to the real `render.py` pipeline (spawned via
 * python3 with the payload piped through stdin) so these tests exercise
 * the production substitution path end-to-end rather than an inline JS
 * substitute.
 *
 * Each interaction loads a fresh widget instance (because the widget
 * script holds module-scoped state that we cannot reset without
 * reloading) and drives clicks against inline onclick handlers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
  name: string;
};
const skillName = packageJson.name.replace(/^claude-skill-/, '');
const renderPath = resolve(__dirname, '../../skill', skillName, 'scripts/render.py');

interface Branch {
  id: string;
  title: string;
  summary: string;
  next_hint: string | null;
  sub: Tree | null;
}

interface Tree {
  question: string;
  basis: string;
  branches: Branch[];
}

interface Payload {
  topic: string;
  submit_instruction: string;
  tree: Tree;
}

const TOPIC = 'authentication strategy';
const SUBMIT_INSTRUCTION = 'Turn this into a one-page brief.';

const makeLeaf = (suffix: string, title: string): Branch => ({
  id: `leaf-${suffix}`,
  title,
  summary: `Concrete approach: ${title}.`,
  next_hint: null,
  sub: null,
});

const makeL1 = (suffix: string, title: string, leaves: Branch[]): Branch => ({
  id: `mid-${suffix}`,
  title,
  summary: `Mid framing: ${title}.`,
  next_hint: 'pick a concrete approach',
  sub: {
    question: `How for ${title}?`,
    basis: 'Implementation-level fork.',
    branches: leaves,
  },
});

const makeL0 = (suffix: string, title: string, mids: Branch[]): Branch => ({
  id: `top-${suffix}`,
  title,
  summary: `Top option: ${title}.`,
  next_hint: 'narrow the approach',
  sub: {
    question: `Which path for ${title}?`,
    basis: 'Strategy-level fork.',
    branches: mids,
  },
});

// 3 L0 -> 2 L1 -> 2 L2 fixture.
const buildFixturePayload = (): Payload => ({
  topic: TOPIC,
  submit_instruction: SUBMIT_INSTRUCTION,
  tree: {
    question: 'What authentication model fits?',
    basis: 'Different models suit different team shapes.',
    branches: [
      makeL0('A', 'Session cookies', [
        makeL1('A1', 'Server sessions', [
          makeLeaf('A1a', 'Redis-backed sessions'),
          makeLeaf('A1b', 'Database-backed sessions'),
        ]),
        makeL1('A2', 'Signed cookies', [
          makeLeaf('A2a', 'Stateless signed cookies'),
          makeLeaf('A2b', 'Rotating signed cookies'),
        ]),
      ]),
      makeL0('B', 'JWT tokens', [
        makeL1('B1', 'Short-lived access tokens', [
          makeLeaf('B1a', 'Refresh token rotation'),
          makeLeaf('B1b', 'Sliding refresh tokens'),
        ]),
        makeL1('B2', 'Long-lived tokens', [
          makeLeaf('B2a', 'Opaque revocation list'),
          makeLeaf('B2b', 'Bloom filter revocation'),
        ]),
      ]),
      makeL0('C', 'OAuth handoff', [
        makeL1('C1', 'Third-party only', [
          makeLeaf('C1a', 'Auth0 hosted'),
          makeLeaf('C1b', 'Clerk hosted'),
        ]),
        makeL1('C2', 'Self-hosted OAuth', [
          makeLeaf('C2a', 'Hydra OSS'),
          makeLeaf('C2b', 'Keycloak OSS'),
        ]),
      ]),
    ],
  },
});

// Production-equivalent slot fill: pipe the JSON payload through render.py
// via stdin and capture stdout. Same code path Claude uses at runtime.
const renderResult = spawnSync('python3', [renderPath], {
  input: JSON.stringify(buildFixturePayload()),
  encoding: 'utf8',
});
if (renderResult.status !== 0) {
  throw new Error(
    `render.py exited with status ${renderResult.status}. Run \`pnpm build\` first.\nstderr: ${renderResult.stderr}`,
  );
}
const filledBundle = renderResult.stdout;

const scriptMatches = Array.from(
  filledBundle.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/g),
);
if (scriptMatches.length === 0) {
  throw new Error('Rendered bundle has no <script type="module"> - run `pnpm build` first');
}
const scriptBody = scriptMatches[scriptMatches.length - 1]?.[1] ?? '';

// Strip the module script (we execute it manually) but keep the inline
// JSON-data script so widget.ts can JSON.parse its contents.
const htmlWithoutModuleScript = filledBundle.replace(
  /<script\s+type="module">[\s\S]*?<\/script>/g,
  '',
);

interface SendPromptSpy {
  calls: string[];
}

interface DocumentBridge {
  __widgetWindow?: unknown;
  __sendPromptCalls?: string[];
}

interface ScriptWindow {
  __sendPromptCalls?: string[];
  toggleNote?: (branchId: string) => void;
  saveNote?: (branchId: string, value: string) => void;
}

const loadWidget = (): SendPromptSpy => {
  document.body.innerHTML = htmlWithoutModuleScript;
  // The widget script's `window` is a separate realm from the test's
  // `document.defaultView`. They share `document` but not the global
  // object. Mirror sendPrompt's call list onto `document` (shared) so
  // the test can read it without bridging across realms.
  const combinedScript = document.createElement('script');
  combinedScript.textContent =
    'document.__sendPromptCalls = []; ' +
    'window.sendPrompt = (text) => { document.__sendPromptCalls.push(text); }; ' +
    'document.__widgetWindow = window; ' +
    scriptBody;
  document.body.appendChild(combinedScript);

  const bridge = document as unknown as DocumentBridge;
  return {
    get calls(): string[] {
      return bridge.__sendPromptCalls ?? [];
    },
  } as SendPromptSpy;
};

const getScriptWindow = (): ScriptWindow =>
  (document as unknown as DocumentBridge).__widgetWindow as ScriptWindow;

const findBranchCard = (branchId: string): HTMLElement | null => {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.b'));
  return (
    cards.find((card) => (card.getAttribute('onclick') ?? '').includes(`'${branchId}'`)) ?? null
  );
};

const findCommitButton = (): HTMLButtonElement | null => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.cr button'));
  return (
    buttons.find((button) => (button.getAttribute('onclick') ?? '').includes('commitAndSubmit')) ??
    null
  );
};

const collectLevelWrappers = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.lv'));

describe('decision-tree widget runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the topic in the header copy and only the L0 level on load', () => {
    loadWidget();
    expect(document.body.textContent).toContain(TOPIC);
    const levels = collectLevelWrappers();
    expect(levels).toHaveLength(1);
    // L0 should show "DECISION 1 OF 3".
    const meta = levels[0]?.querySelector('.lm')?.textContent ?? '';
    expect(meta).toContain('DECISION 1 OF 3');
    // All three L0 branch cards are present.
    expect(findBranchCard('top-A')).not.toBeNull();
    expect(findBranchCard('top-B')).not.toBeNull();
    expect(findBranchCard('top-C')).not.toBeNull();
    // L1 / L2 hidden until a pick is made.
    expect(findBranchCard('mid-A1')).toBeNull();
    expect(findBranchCard('leaf-A1a')).toBeNull();
  });

  it("clicking an L0 branch reveals the L1 level with that branch's subtree", () => {
    loadWidget();
    findBranchCard('top-A')?.click();

    const levels = collectLevelWrappers();
    expect(levels).toHaveLength(2);
    // The newly revealed L1 wrapper should mention DECISION 2 OF 3.
    const secondMeta = levels[1]?.querySelector('.lm')?.textContent ?? '';
    expect(secondMeta).toContain('DECISION 2 OF 3');
    // L1 cards under top-A render; cards under top-B do not.
    expect(findBranchCard('mid-A1')).not.toBeNull();
    expect(findBranchCard('mid-A2')).not.toBeNull();
    expect(findBranchCard('mid-B1')).toBeNull();
    // The chosen L0 card is marked active after the rerender.
    const reselectedTopA = findBranchCard('top-A');
    expect(reselectedTopA?.className).toMatch(/\bactive\b/);
  });

  it('clicking an L1 branch reveals the L2 leaf level', () => {
    loadWidget();
    findBranchCard('top-A')?.click();
    findBranchCard('mid-A1')?.click();

    const levels = collectLevelWrappers();
    expect(levels).toHaveLength(3);
    const finalMeta = levels[2]?.querySelector('.lm')?.textContent ?? '';
    expect(finalMeta).toContain('DECISION 3 OF 3');
    expect(finalMeta).toContain('FINAL');
    expect(findBranchCard('leaf-A1a')).not.toBeNull();
    expect(findBranchCard('leaf-A1b')).not.toBeNull();
    // The commit row only surfaces after an L2 leaf is picked.
    expect(findCommitButton()).toBeNull();
  });

  it('picking an L2 leaf surfaces the commit row', () => {
    loadWidget();
    findBranchCard('top-A')?.click();
    findBranchCard('mid-A1')?.click();
    findBranchCard('leaf-A1a')?.click();

    const commitButton = findCommitButton();
    expect(commitButton).not.toBeNull();
    const leafCard = findBranchCard('leaf-A1a');
    expect(leafCard?.className).toMatch(/\bactive\b/);
  });

  it('committing sends a prompt containing the full path, submit_instruction, and the topic', () => {
    const spy = loadWidget();
    findBranchCard('top-A')?.click();
    findBranchCard('mid-A1')?.click();
    findBranchCard('leaf-A1a')?.click();
    findCommitButton()?.click();

    expect(spy.calls).toHaveLength(1);
    const message = spy.calls[0] ?? '';
    expect(message).toContain(`Decision navigator submission (${TOPIC})`);
    expect(message).toContain('Committed path:');
    expect(message).toContain('1. What authentication model fits? -> Session cookies');
    expect(message).toContain('2. Which path for Session cookies? -> Server sessions');
    expect(message).toContain('3. How for Server sessions? -> Redis-backed sessions');
    // The submit instruction must end the payload.
    expect(message.endsWith(SUBMIT_INSTRUCTION)).toBe(true);
  });

  it('switching an L0 pick before committing records the abandoned branch under "Also explored"', () => {
    const spy = loadWidget();
    // Start down top-A, then switch to top-B at the L0 level.
    findBranchCard('top-A')?.click();
    findBranchCard('top-B')?.click();
    // Now walk down top-B's subtree and commit.
    findBranchCard('mid-B1')?.click();
    findBranchCard('leaf-B1a')?.click();
    findCommitButton()?.click();

    expect(spy.calls).toHaveLength(1);
    const message = spy.calls[0] ?? '';
    expect(message).toContain('Also explored:');
    expect(message).toContain('- Session cookies');
    expect(message).toContain('2. Which path for JWT tokens? -> Short-lived access tokens');
    expect(message).toContain('3. How for Short-lived access tokens? -> Refresh token rotation');
  });

  it('saving a note on a branch attaches it to the committed brief under "Annotations"', () => {
    const spy = loadWidget();
    findBranchCard('top-A')?.click();

    // Open the note editor on mid-A1 by invoking toggleNote on the
    // widget script's window (a separate realm from the test's window in
    // vitest's jsdom env). Invoking it directly bypasses the synthetic-
    // click plumbing while still exercising the real state machine.
    const widgetGlobals = getScriptWindow();
    widgetGlobals.toggleNote?.('mid-A1');
    const editor = document.querySelector<HTMLTextAreaElement>('#ni-mid-A1');
    expect(editor).not.toBeNull();
    widgetGlobals.saveNote?.('mid-A1', 'Prior art: existing redis cluster.');

    findBranchCard('mid-A1')?.click();
    findBranchCard('leaf-A1a')?.click();
    findCommitButton()?.click();

    expect(spy.calls).toHaveLength(1);
    const message = spy.calls[0] ?? '';
    expect(message).toContain('Annotations:');
    expect(message).toContain('- Server sessions: "Prior art: existing redis cluster."');
  });

  it('after committing, further branch clicks do not produce additional sendPrompt calls', () => {
    const spy = loadWidget();
    findBranchCard('top-A')?.click();
    findBranchCard('mid-A1')?.click();
    findBranchCard('leaf-A1a')?.click();
    findCommitButton()?.click();
    expect(spy.calls).toHaveLength(1);

    // Try to switch picks after commit; selectBranch is a no-op when
    // state.committed is true.
    findBranchCard('top-B')?.click();
    expect(spy.calls).toHaveLength(1);
    // The committed leaf card should now carry the committed class.
    const leaf = findBranchCard('leaf-A1a');
    expect(leaf?.className).toMatch(/\bcommitted\b/);
  });
});
