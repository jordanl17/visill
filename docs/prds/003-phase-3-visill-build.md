# PRD 003 - Phase 3: `@visill/build`

Status: Shipped. Owner: jordan.lawrence@sanity.io. Date: 2026-05-27.

## 1. Goal

Ship `@visill/build` v0.1: a Vite plugin package that consolidates the bundle-finalisation and skill-assembly pipeline duplicated across `claude-skill-decision-tree` and `claude-skill-linear-editing` into one shared, configurable, tested module. Replace the triplicated skill-name derivation with a single canonical resolver.

## 2. Scope

In:
- Two Vite plugins: `finalizeBundle()`, `assembleSkill()`.
- One helper: `resolveSkillName(repoRoot)`.
- One config sugar: `defineVisillConfig({ ...extras })` that bakes in terser, lightningcss, `modulePreload: false`, `base: './'`, `viteSingleFile({ removeViteModuleLoader: true })`, and `emptyOutDir: false`.
- Plugin ordering enforced by `enforce: 'post'` plus consumer-side plugin list order (finalize before assemble).

Out:
- Rollup-level customisation hooks (no `rollupOptions` injection helpers beyond passthrough).
- Per-skill domain validators (description length, schema validation, token-leak checks live in `@visill/test` or the scaffolder).
- Alternate bundlers, watch-mode tooling, dev server customisation.
- Anything touching `render.py` or the assembled SKILL.md beyond `{{SCHEMA}}` slot substitution.

## 3. Deliverables

`packages/visill-build/`:
- `src/finalize-bundle.ts` - the `finalizeBundle` plugin factory.
- `src/assemble-skill.ts` - the `assembleSkill` plugin factory and `renderSchemaReference` helper.
- `src/resolve-skill-name.ts` - the precedence resolver.
- `src/define-visill-config.ts` - the config sugar wrapping `defineConfig`.
- `src/index.ts` - public surface (4 named exports).
- `package.json` - `name: "@visill/build"`, ESM-only, peer-deps on `vite` and `vite-plugin-singlefile`.
- `test/fixtures/hello/` - minimal skill with `widget-src/`, `skill-src/`, `package.json`, `LICENSE`, `vite.config.ts`.
- `test/fixtures/hello.golden/` - expected assembled `skill/hello/` tree (committed snapshot).
- `test/build.test.ts` - drives `vite build` in the fixture, diffs the assembled tree against the golden.
- `test/determinism.test.ts` - runs `vite build` twice, asserts byte-equal output across runs.
- `test/resolve-skill-name.test.ts` - unit coverage of precedence rules.
- `README.md` - usage snippet (consumer `vite.config.ts` reduced to ~5 lines).

Adjacent docs (this phase):
- `docs/adrs/0010-finalize-bundle-html-rewrites.md` - documents the 3 regex passes, why each leftover is safe to drop, why `type="module"` must stay.
- `docs/adrs/0008-skill-name-resolution.md` - precedence order and rationale.

## 4. Lift map

From `claude-skill-decision-tree/vite.config.ts` (byte-identical to linear-editing):
- `finalizeBundle()`: lines 24-53 lift wholesale - the `htmlTransforms` array (24-33) and plugin body (35-52). Parameterise `outDir` (default `options.dir`), `sourceName` (default `widget.html`), `targetName` (default `widget-bundled.html`), `sizeLimit` (optional, throws if exceeded).
- `renderSchemaReference()`: lines 58-61, internal helper.
- `assembleSkill()`: lines 63-104 lift wholesale. Parameterise `skillDir`, `skillSrcDir`, `slotToken` (default `{{SCHEMA}}`), `extras` (optional array of `{ from, to, executable? }` entries for additional copy ops).
- `defineVisillConfig()`: lifts lines 106-129 with `root`, `base`, plugins, `css`, and `build` defaults; shallow-merges user extras except `plugins` (concatenated, user plugins appended) and `build` (shallow-merged).

From `scripts/build-zip.sh` (line 7): the skill-name derivation graduates into `resolveSkillName`.

`claude-targettable-feedback/vite.config.ts` predates `assembleSkill` and is not a lift source.

## 5. Plugin contracts

**`finalizeBundle({ outDir?, sourceName?, targetName?, sizeLimit? })`**
- Hook: `writeBundle` with `enforce: 'post'`.
- Reads `<outDir>/<sourceName>`, applies the three transforms via `Array.reduce`, writes `<outDir>/<targetName>`, deletes the source, logs byte length via `this.info`.
- Throws with actual-vs-limit detail when `sizeLimit` is set and `Buffer.byteLength(finalized, 'utf8') > sizeLimit`.
- File-system side effects stay within `outDir`.

**`assembleSkill({ skillDir, skillSrcDir, slotToken?, extras? })`**
- Hook: `writeBundle` with `enforce: 'post'`. Runs after `finalizeBundle` (consumer plugin-list order).
- Reads `skillSrcDir/SKILL.md`, replaces `slotToken` with fenced JSON of `skillSrcDir/assets/schema.json`, writes to `skillDir/SKILL.md`.
- Copies `assets/schema.json`, recursive-copies `scripts/` and `references/`, copies repo `LICENSE`.
- Chmods `scripts/render.py` to `0o755`.
- Copies `extras` entries verbatim with optional `chmod 0o755`.

**Ordering**: consumer plugin array is `[viteSingleFile(...), finalizeBundle(...), assembleSkill(...)]`. Both visill plugins use `enforce: 'post'`; Vite preserves array order among same-enforce plugins.

## 6. Test plan

- **Golden-tree fixture** (`test/build.test.ts`): spawn `vite build` against `test/fixtures/hello/`. Walk `skill/hello/` and `test/fixtures/hello.golden/skill/hello/`, assert identical file sets and byte-equal contents. `widget-bundled.html` is asserted structurally: module script present, no `crossorigin`, no `rel="stylesheet"`, size under threshold.
- **Determinism** (`test/determinism.test.ts`): two consecutive `vite build` runs, hash every file in `skill/hello/`, assert pairwise equality.
- **`type="module"` preservation**: regex assertion against `widget-bundled.html` for `<script type="module">` with no `crossorigin`.
- **`sizeLimit` overflow**: separate fixture or env-toggled limit; assert `vite build` exits non-zero with the expected message.
- **`resolveSkillName` unit tests**: `visill.config.ts` wins when present; package.json alone strips `visill-` and `claude-skill-`; absence of both throws.

## 7. `resolveSkillName` precedence

1. `visill.config.ts` at `repoRoot` exporting `{ name }` (or `default { name }`) wins outright.
2. `package.json#name` at `repoRoot`, with `^visill-` stripped, else `^claude-skill-` stripped, else used as-is.
3. Throw `Error("resolveSkillName: no visill.config.ts and no package.json#name at <repoRoot>")`.

Rationale captured in ADR 0008.

Superseded in Phase 6.1 by [ADR 0025](../adrs/0025-skill-name-from-package-json.md): `visill.config.ts` is no longer part of the `resolveSkillName` contract; only `package.json#name` is consulted.

## 8. Success criteria

- `pnpm --filter @visill/build test` passes locally and in CI.
- Golden-tree fixture diff is empty after `vite build`.
- `sizeLimit` rejects an oversized bundle with a clear message.
- `widget-bundled.html` always contains `<script type="module">` and never `crossorigin` or `rel="stylesheet"` on the inlined `<style>`/`<script>`.
- Two consecutive builds yield byte-equal `skill/hello/` trees.
- A consumer `vite.config.ts` reduces to roughly: import `defineVisillConfig`, call `resolveSkillName(import.meta.dirname)`, export `defineVisillConfig({ build: { outDir: ... } })`. Five lines plus imports.

Superseded in Phase 6.1 by [ADR 0025](../adrs/0025-skill-name-from-package-json.md): `visill.config.ts` is no longer part of the `resolveSkillName` contract; only `package.json#name` is consulted.

## 9. Commits within this phase

1. Scaffold `packages/visill-build/` (package.json, tsconfig, src/index.ts stub).
2. Add ADR 0010 (finalize-bundle html rewrites).
3. Implement `finalizeBundle` + unit test.
4. Add ADR 0008 (skill-name resolution).
5. Implement `resolveSkillName` + unit tests.
6. Implement `assembleSkill` + `renderSchemaReference`.
7. Implement `defineVisillConfig`.
8. Add `test/fixtures/hello/` + golden tree + integration test.
9. Add determinism test.
10. Add README and Changeset entry.

## 10. Dependencies

- Depends on Phase 1 (monorepo scaffolding, Changesets, pnpm workspace, oxlint, prettier, CI).
- Consumed by Phase 5 (`create-visill` scaffolder template wires it in) and Phase 6 (lockstep migration of the three existing repos).

## 11. Risks and mitigations

- **Vite plugin API churn between minors**: pin the `vite` peer-dep to a narrow range, add a CI matrix run against the next Vite minor as a soft signal, document the `writeBundle` contract in ADR 0010.
- **Regex brittleness over emitted HTML**: the three regexes assume current `vite-plugin-singlefile` output. Assert post-conditions structurally (no `crossorigin`, no `rel="stylesheet"` on inline tags) rather than counting replacements, and pin `vite-plugin-singlefile` as a peer-dep with a narrow range.
- **Golden-tree drift across platforms** (line endings, file modes on Windows): tests run on macOS and Ubuntu in CI; the fixture is text-only; Windows is best-effort.
- **`chmod 0o755` is a no-op on Windows**: tolerated; release zips ship from Linux.

## 12. Open questions

- `defineVisillConfig` merge semantics for nested Vite options: shallow merge for `build`, concat for `plugins`, override for everything else. Should `build` instead be deep-merged so a consumer can override only `build.terserOptions.compress`? Lean shallow for v0.1, revisit if a consumer hits friction.
- Should `extras` in `assembleSkill` accept glob patterns, or does the literal `{ from, to }` list suffice for the three known skills? Lean literal for v0.1.
- Does `resolveSkillName` need an explicit `prefixes` option, or does the hardcoded `['visill-', 'claude-skill-']` list hold until a fourth prefix appears? Lean hardcoded.

## 13. Delivery

- Direct push to `main` at `jordanl17/visill`. Commit `7012a3e` on 2026-05-27. CI green in 25s on the first run.
- Local commit message: `feat(visill-build): vite plugins that assemble widget skills`.
- Quality gate at wrap-up: workspace `typecheck` + `lint` + `test` + `build` + `format:check` all clean. 38 tests pass workspace-wide; 18 belong to `@visill/build`.
- Tarball shape verified by the build-output integration test, not by `pnpm pack`. Phase 7 will gate publish on a `pnpm pack` snapshot.
- ADRs 0010 and 0011 promoted from Proposed to Accepted in the same commit; canonical index updated.
- Open questions §12 carry forward to v0.2 if a consumer hits friction: deep-merge `build`, glob `extras`, configurable prefixes. None blocked any Phase 3 work.

## 14. Lessons learned

- **Peer deps that the bundled defaults reference must be declared.** The first build failed because `lightningcss` and `terser` were not on the `@visill/build` peer list, even though `defineVisillConfig` defaults bake them in. Lifted from the source repos' `devDependencies` into both `peerDependencies` and `devDependencies` of `@visill/build`. Future packages that bake in named third-party tooling need the same audit.
- **Workspace `skill/` gitignore swallowed the golden tree.** The repo-wide `skill/` rule (set in Phase 1 to keep build artefacts out of git) also matched `test/fixtures/hello.golden/skill/`. Added a single negation line. Worth flagging in Phase 6 when migrating repos: each migrating skill carries its own `skill/` in `.gitignore` already, and the fixture pattern is monorepo-only.
- **Shell `$PATH` carried a stale global `vite` from a prior Node 21 install.** Tests that spawn `vite` via `pnpm exec` or PATH hit the wrong binary. The build and determinism tests resolve `packages/visill-build/node_modules/.bin/vite` explicitly via `import.meta.url`. Consumers of `@visill/build` will not see this because they invoke `vite` via their own package scripts; only the fixture inside this package is affected.
- **Vitest file parallelism races on shared output dirs.** `build.test.ts` and `determinism.test.ts` both rm-rf the same `skill/hello/` output. Set `fileParallelism: false` in `vitest.config.ts` rather than splitting the fixture - serial execution keeps the two tests cohesive and total runtime is still ~1.3s. Tests that share filesystem state are still allowed; the cost is a few hundred milliseconds, not a redesign.
- **Vitest defaults are fine.** An earlier draft set `testTimeout: 30000`. The full suite runs in 1.3s. Defaults removed before commit. Rule of thumb: do not raise vitest timeouts above defaults without measuring the actual run.
- **The simplifier earns its slot.** Three small wins: arrow consts to function declarations, `expect(...).not.toContain(...)` over `expect(...includes(...)).toBe(false)`, deduped `node:path` import. None worth a reviewer's time individually; the pass collected them in one shot.
- **The reviewer call-out on `assembleSkill` LICENSE path is now PRD §12 territory.** Resolved via `path.resolve(skillSrcDir, '..', 'LICENSE')`; works for every existing repo. A `repoRoot` or `licenseFile` option is the v0.2 fallback if a consumer's tree differs.
