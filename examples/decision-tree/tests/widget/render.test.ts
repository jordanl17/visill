import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
  name: string;
};
const skillName = packageJson.name.replace(/^claude-skill-/, '');
const renderPath = resolve(__dirname, '../../skill', skillName, 'scripts/render.py');

const runRender = (payload: string) =>
  spawnSync('python3', [renderPath], { input: payload, encoding: 'utf8' });

const makeLeaf = (id: string, title: string, summary: string) => ({
  id,
  title,
  summary,
  next_hint: null,
  sub: null,
});

const makeL1 = (
  id: string,
  title: string,
  question: string,
  basis: string,
  leaves: ReturnType<typeof makeLeaf>[],
) => ({
  id,
  title,
  summary: `${title} options.`,
  next_hint: 'pick a concrete approach',
  sub: { question, basis, branches: leaves },
});

const makeL0 = (
  id: string,
  title: string,
  question: string,
  basis: string,
  mids: ReturnType<typeof makeL1>[],
) => ({
  id,
  title,
  summary: `${title} approach.`,
  next_hint: 'narrow the approach',
  sub: { question, basis, branches: mids },
});

// A minimal valid 3-level tree: 2 L0 / 2 L1 per L0 / 2 L2 per L1 = 14 nodes.
const buildPayload = (overrides: Record<string, unknown> = {}) => ({
  topic: 'authentication strategy',
  submit_instruction: 'Turn this into a one-page brief.',
  tree: {
    question: 'How should we handle auth?',
    basis: 'The auth choice shapes everything downstream.',
    branches: [
      makeL0('managed', 'Managed provider', 'Which managed provider?', 'Providers differ on DX.', [
        makeL1('dx', 'Best DX', 'Polished SDK or open-source?', 'DX splits two ways.', [
          makeLeaf('clerk', 'Clerk', 'Drop-in React components.'),
          makeLeaf('supabase', 'Supabase Auth', 'Bundled with Postgres.'),
        ]),
        makeL1(
          'enterprise',
          'Enterprise-ready',
          'Identity-first or workforce-first?',
          'Two flavours of enterprise auth.',
          [
            makeLeaf('auth0', 'Auth0', 'Mature, broad SDK coverage.'),
            makeLeaf('workos', 'WorkOS', 'SSO/SCIM-first for B2B.'),
          ],
        ),
      ]),
      makeL0('diy', 'Roll your own', 'Which session model?', 'DIY auth lives on session shape.', [
        makeL1(
          'server',
          'Server sessions',
          'Where to store the session row?',
          'Storage choice affects latency.',
          [
            makeLeaf('postgres', 'Postgres sessions', 'Sessions table in your existing Postgres.'),
            makeLeaf('redis', 'Redis sessions', 'Sub-millisecond lookups, native TTL.'),
          ],
        ),
        makeL1(
          'jwt',
          'Stateless JWTs',
          'How to handle revocation?',
          'Pure stateless needs a revocation answer.',
          [
            makeLeaf('short-ttl', 'Short TTL + refresh', '15-min access JWT plus DB refresh row.'),
            makeLeaf('denylist', 'Token denylist', 'Long-lived JWT with Redis denylist for jtis.'),
          ],
        ),
      ]),
    ],
  },
  ...overrides,
});

describe('render.py', () => {
  it('substitutes the topic and tree slots with a valid 3-level payload', () => {
    const result = runRender(JSON.stringify(buildPayload()));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('authentication strategy');
    expect(result.stdout).toContain('Managed provider');
    expect(result.stdout).not.toContain('{{topic}}');
    expect(result.stdout).not.toContain('{{{tree_json}}}');
  });

  it('derives *_json variants from every top-level payload key', () => {
    const result = runRender(JSON.stringify(buildPayload()));
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/<script\s+id="navigator-data"\s+type="application\/json">/);
    expect(result.stdout).toContain('"topic": "authentication strategy"');
    expect(result.stdout).toContain('"submit_instruction":');
  });

  it('JSON-encodes quoted characters in topic so the inline JSON stays valid', () => {
    const result = runRender(
      JSON.stringify(buildPayload({ topic: 'authentication "JWT" strategy' })),
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('authentication &quot;JWT&quot; strategy');
    expect(result.stdout).toContain('"topic": "authentication \\"JWT\\" strategy"');
  });

  it('rejects missing required top-level property "tree" with non-zero exit', () => {
    const { tree, ...withoutTree } = buildPayload();
    const result = runRender(JSON.stringify(withoutTree));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('tree');
  });

  it('rejects missing required property "branches" inside tree with non-zero exit', () => {
    const broken = buildPayload({ tree: { question: '?', basis: 'b' } });
    const result = runRender(JSON.stringify(broken));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('branches');
  });

  it('rejects wrong type for tree (string instead of object) with non-zero exit', () => {
    const broken = buildPayload({ tree: 'not an object' });
    const result = runRender(JSON.stringify(broken));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('tree');
  });

  it('rejects a 2-level tree (L0 nodes without sub) with a clear error', () => {
    const shallow = buildPayload({
      tree: {
        question: 'How should we handle auth?',
        basis: 'b',
        branches: [
          { id: 'a', title: 'Managed', summary: 'Use a provider', next_hint: null, sub: null },
          { id: 'b', title: 'DIY', summary: 'Build your own', next_hint: null, sub: null },
        ],
      },
    });
    const result = runRender(JSON.stringify(shallow));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('3 levels');
  });

  it('rejects an L1 node without sub (ragged 2-level branch) with a clear error', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = buildPayload();
    payload.tree.branches[0].sub.branches[0].sub = null;
    const result = runRender(JSON.stringify(payload));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('3 levels');
  });

  it('rejects an L2 node WITH a sub (4 levels deep) with a clear error', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = buildPayload();
    payload.tree.branches[0].sub.branches[0].sub.branches[0].sub = {
      branches: [{ id: 'too-deep', title: 'Too deep', summary: 's', next_hint: null, sub: null }],
    };
    const result = runRender(JSON.stringify(payload));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('terminal');
  });

  it('rejects fewer than 2 children at a level', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = buildPayload();
    payload.tree.branches[0].sub.branches = [payload.tree.branches[0].sub.branches[0]];
    const result = runRender(JSON.stringify(payload));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('2-4');
  });

  it('rejects invalid JSON on stdin with non-zero exit', () => {
    const result = runRender('not-json');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('invalid JSON');
  });

  it('rejects empty stdin with usage message', () => {
    const result = runRender('');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('stdin');
  });
});
