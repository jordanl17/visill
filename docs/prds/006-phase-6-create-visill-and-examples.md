# Phase 6 - create-visill scaffolder, canonical template, vendored decision-tree example

Status: Shipped with follow-up (Phase 6.1). Owner: jordan.lawrence@sanity.io. Date: 2026-05-27.

## Delivery

Two commits on `main`:

- `25410f8` (feat): create-visill scaffolder, canonical template, vendored decision-tree integration gate, tsup ESM migration for visill/visill-build/visill-test, ADRs 0016/0017/0018/0023 Accepted.
- `63c4f19` (fix(ci)): build workspace SDK before scaffolder smoke + example gates.

CI: `ci`, `scaffolder-windows` green. `scaffolder-smoke` and `vendored-example` red on `main` post-push; root cause is two Phase 3 / Phase 1 design gaps that the integration gate surfaced exactly as ADR 0017 promised. Phase 6.1 (`docs/prds/006.1-phase-6.1-config-helpers-and-test-layout.md`) closes both gaps.

Local quality gate verified pre-commit: 155 tests passing across all packages plus the vendored example. Prepublish guard rejects `workspace:` and surviving sentinels. Scaffolder produces a clean `hello/` tree end-to-end (no sentinel survivors).

## Lessons learned

- **The integration gate works.** ADR 0017 promised the vendored example would surface SDK / plugin / contract drift before publish. It surfaced two: `defineVisillConfig` incomplete defaults (Phase 3 gap) and workspace ESM resolution under tsc (workspace-wide bug fixed by tsup migration mid-phase, ADR 0023). Both bugs would have shipped to downstream consumers without this gate.
- **Data-contract redesign mid-phase.** Initial wave produced an incoherent contract (`message` vs `greeting` vs `name` across schema / widget / SKILL.md / evals). Audit + rename to `name` + new Data flow section in SKILL.md taught the layer separation. Future phases should produce the contract spec BEFORE fanning out template content waves.
- **Sub-agent harness fan-out scales.** 25 parallel sub-agents in Wave B-H ran cleanly; reconciliation took one consolidated review sub-agent + a focused remediation sub-agent. No coordinator-side merge conflicts because the task graph kept file sets disjoint.
- **Zip-size baseline is delivery bytes, not LLM context.** The 29745-byte baseline reflects framework content + Phase 4 canonical scripts + extra references vs the 19499-byte upstream. Per user guidance, the prosperity metric is SKILL.md + references/ size (~28KB current); the zip assertion is a coarse delivery-bytes proxy. Phase 7+ should add explicit LLM-context tracking.
- **Stop-and-ask escalation matters.** After two failed CI recovery attempts, escalating to the user (per playbook Stage 6 step 5) surfaced design-level concerns that would have spiraled if pursued in the recovery loop. Phase 6.1 captures the cleaner fix shape.

## 1. Goal

Stand up the author-facing entry point: `npm create visill <name>` produces a building, testing, releasing skill repo in under 30 seconds. A vendored snapshot of the decision-tree skill exercises the same template end-to-end and doubles as the framework's integration gate.

## 2. Scope

In:
- `packages/create-visill/` CLI (single skill-name prompt, defaults everything else).
- `packages/create-visill/template/` canonical scaffold output mirroring the design doc's Architecture section.
- `examples/decision-tree/` workspace package consuming `workspace:*` of `visill`, `@visill/build`, `@visill/test`.
- Two CI integration gates wiring both of the above.

Out:
- Alternate template flavours.
- Eval CLI.
- Description optimiser.
- Additional vendored examples (linear-editing and targettable-feedback land in their own migration phases).

## 3. Deliverables

### A. `packages/create-visill/`

- `package.json` - `name: "create-visill"`, `bin: { "create-visill": "./dist/index.js" }`, `engines.node: ">=20.11.0"`, ESM, zero runtime deps beyond `node:fs`, `node:path`, `node:url`.
- `src/index.ts` - prompt flow, template copy, sentinel substitution, post-install message.
- `src/sentinels.ts` - sentinel table and validator.
- `tsup.config.ts` (or equivalent) - emits single-file `dist/index.js` with shebang banner; build script chmods 0755 before publish.
- `scripts/prepublish-guard.mjs` - greps the staged template for `workspace:` and any surviving sentinel; exits non-zero on hits.
- `README.md` - one-screen usage.

### B. `packages/create-visill/template/`

Mirrors the design doc's Architecture layout exactly. File list:

- `widget-src/widget.html`, `widget.css`, `widget.ts`, `globals.d.ts`
- `skill-src/SKILL.md` (description placeholder under 1024 chars, `{{SCHEMA}}` slot)
- `skill-src/assets/schema.json`
- `skill-src/scripts/render.py`
- `skill-src/scripts/_vendor/chevron/` (full chevron tree, no `__pycache__`)
- `skill-src/references/mustache-syntax.md`, `schema-authoring.md`
- `tests/widget/bundle.test.ts`, `widget.test.ts`, `render.test.ts`
- `tests/evals/evals.json`, `grade.ts`, `build_preview.ts`, `orchestrator.md`, `shared.ts`
- `tests/EVALS.md`, `trigger-cases.md`
- `.claude/skills/` - starter dev-aid skills (roster in open questions)
- `scripts/build-zip.sh`
- `.github/workflows/build.yml`, `release.yml` (with pnpm-pin fix encoded)
- `vite.config.ts` - ~5 lines using `defineVisillConfig` from `@visill/build`
- `visill.config.ts`
- `package.json` - `"packageManager": "pnpm@10.x.y"`, `"engines": {"node": ">=20.11.0"}`
- `.gitignore` - canonical pattern set lifted from the three existing skill repos:
  ```
  node_modules/
  skill/
  *-workspace/
  *.zip
  dist/
  .claude/
  .husky/_/
  __pycache__/
  *.pyc
  package-lock.json
  yarn.lock
  ```
- `.prettierignore` - lifted from the three skills, plus the lockfile policy:
  ```
  node_modules/
  skill/
  *-workspace/
  dist/
  pnpm-lock.yaml
  CHANGELOG.md
  ```
- `.oxlintrc.json` - mirrors the canonical config used by all three existing skills:
  ```json
  {
    "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
    "categories": {
      "correctness": "error",
      "perf": "warn",
      "restriction": "off",
      "style": "off",
      "suspicious": "warn"
    },
    "rules": {
      "no-unused-vars": "warn",
      "eqeqeq": "error",
      "no-debugger": "error",
      "no-console": "off"
    },
    "ignorePatterns": [
      "node_modules/",
      "skill/*/assets/widget-bundled.html",
      "*-workspace/",
      "dist/"
    ]
  }
  ```
- `release-please-config.json`, `.release-please-manifest.json`
- `README.md`, `LICENSE`

Phase 6.1 follow-up: `visill.config.ts` was removed from the template per [ADR 0025](../adrs/0025-skill-name-from-package-json.md).

### C. `examples/decision-tree/`

Vendored snapshot of the upstream decision-tree repo, rewritten to:
- Replace the ad-hoc `vite.config.ts` with the framework one.
- Replace local helpers with `visill` SDK imports.
- Replace the bundle test with `createBundleTests({...})` from `@visill/test`.
- Consume `visill`, `@visill/build`, `@visill/test` via `workspace:*` in `package.json`.
- Omit `pnpm-lock.yaml` (uses the root lockfile).
- Exclude `__pycache__`, upstream `.husky/_/`, `decision-tree.zip`, `node_modules`.

## 4. Lift map

Per-template-file source:

| Template path | Lifted from |
|---|---|
| `widget-src/*` | `claude-skill-decision-tree/widget-src/*` (generalised: rename brand-specific identifiers to `hello`-flavoured) |
| `skill-src/SKILL.md` | decision-tree, with sentinels `<<SKILL_NAME>>`, `<<SKILL_DESCRIPTION>>`, `<<SKILL_TITLE>>` |
| `skill-src/assets/schema.json` | minimal hello-world schema; structure from decision-tree |
| `skill-src/scripts/render.py` | decision-tree (canonical) |
| `skill-src/scripts/_vendor/chevron/` | decision-tree, `__pycache__` purged |
| `skill-src/references/mustache-syntax.md` | claude-skill-linear-editing |
| `skill-src/references/schema-authoring.md` | claude-skill-linear-editing |
| `tests/widget/{bundle,widget,render}.test.ts` | decision-tree, rewritten to call `@visill/test` helpers |
| `tests/evals/*` | decision-tree, with hardcoded summary stats removed (anti-pattern #3) |
| `tests/EVALS.md`, `trigger-cases.md` | decision-tree |
| `scripts/build-zip.sh` | decision-tree verbatim |
| `.github/workflows/build.yml` | linear-editing build.yml |
| `.github/workflows/release.yml` | linear-editing release.yml, with `pnpm/action-setup` version-input omitted |
| `vite.config.ts` | new - thin `defineVisillConfig` call |
| `visill.config.ts` | new |
| `package.json`, `release-please-config.json` | decision-tree shape |
| `.gitignore`, `.prettierignore`, `.oxlintrc.json` | the three skills' canonical patterns (see section 3 for the full enumeration), plus the lockfile policy from ADR 0018 |

## 5. Scaffolder behaviour spec

Prompt flow:
1. If `argv[2]` is present, treat it as the skill name and skip the prompt.
2. Otherwise, show one prompt: `Skill name (kebab-case):`.
3. Validate against `/^[a-z][a-z0-9-]{1,38}$/`.

Sentinels: `<<SKILL_NAME>>`, `<<SKILL_NAME_PASCAL>>`, `<<SKILL_DESCRIPTION>>`, `<<SKILL_TITLE>>`, `<<AUTHOR>>` (defaults from `git config user.name`/`user.email`), `<<YEAR>>`. After substitution the scaffolder greps the output tree for `<<` and exits non-zero on survivors.

PM detection: read `process.env.npm_config_user_agent` and parse the leading token (`pnpm`/`npm`/`yarn`/`bun`). Used only for the printed next-steps echo and the `README.md` example commands. Template files do not branch.

Post-scaffold echo:

```
Created <name>/ via visill.
Next:
  cd <name>
  <pm> install
  <pm> build
  <pm> test
```

## 6. Template engineering - workspace vs publish

Problem: `template/package.json` must reference visill packages, which are unpublished during local dev. Approach:

- The template ships with `"visill": "^0.1.0-rc.N"` (real semver) as the source of truth.
- A monorepo-only build step (`scripts/build-template.mjs`) materialises a `template-dev/` mirror with those entries rewritten to `workspace:*`. The scaffolder's CI smoke test runs against `template-dev/`; the publish pipeline pushes the unmodified `template/`.
- The prepublish guard asserts no `workspace:` strings remain in the to-be-published `template/`.
- A second CI job runs `pnpm pack` on `packages/create-visill`, installs the tarball into a clean `/tmp` dir, runs `create-visill smoke-test`, then `pnpm install` against the locally packed registry-shaped `visill` tarballs. This catches version drift between the template and the published SDK.

## 7. Vendored example setup

`examples/decision-tree/package.json`:
- `"private": true`.
- `dependencies` declares `"visill": "workspace:*"`, `"@visill/build": "workspace:*"`, `"@visill/test": "workspace:*"`.
- Inherits root `packageManager`, lint, and format.

Root `pnpm-workspace.yaml` adds `examples/*`.

CI job (folded into the root `build.yml`):
1. `pnpm --filter=./examples/decision-tree build`
2. `pnpm --filter=./examples/decision-tree test`
3. Assert `examples/decision-tree/skill/decision-tree.zip` exists and weighs no more than upstream `claude-skill-decision-tree`'s `main` `decision-tree.zip` (snapshot file committed under `examples/decision-tree/.baseline-size`).

Catches: SDK API drift, build-plugin output drift, bundle-test threshold drift, render.py contract drift, release-zip layout drift.

## 8. Test plan

Both gates wired into root `build.yml`:

Gate 1 - scaffolder smoke:
- `pnpm -F create-visill build`.
- `node packages/create-visill/dist/index.js hello` into a tmp dir.
- `pnpm install` (resolved via workspace overrides for SDK packages).
- `pnpm build && pnpm test`.
- Assert `tmp/hello/skill/hello.zip` exists, is non-empty, contains `hello/SKILL.md` and `hello/scripts/render.py` (mode `0755`), and carries no `__pycache__` or `<<` sentinels.

Gate 2 - vendored example: as in section 7.

Unit tests inside `packages/create-visill/`:
- Sentinel substitution covers every defined sentinel.
- Skill-name validator rejects uppercase, leading digits, and out-of-range lengths.
- PM detection parses each of `pnpm/x`, `npm/x`, `yarn/x`, `bun/x`, and `undefined`.

## 9. Success criteria

- Both CI gates green on `main`.
- `npm create visill hello` (or `pnpm create visill hello`) finishes scaffold + install + build + test on a clean machine in ≤ 30s wall (excluding network install).
- `examples/decision-tree/skill/decision-tree.zip` size ≤ current upstream `main` `decision-tree.zip` (19499 bytes baseline).
- Prepublish guard rejects any `workspace:` string or unreplaced sentinel.

## 10. Commits within this phase

1. `feat(create-visill): scaffolder skeleton, single-prompt CLI, sentinel engine`
2. `feat(create-visill): template - widget-src lifted from decision-tree`
3. `feat(create-visill): template - skill-src incl. render.py + vendored chevron`
4. `feat(create-visill): template - tests/widget using @visill/test helpers`
5. `feat(create-visill): template - tests/evals minus hardcoded stats`
6. `feat(create-visill): template - vite.config + visill.config + package.json`
7. `feat(create-visill): template - .github workflows with pnpm-pin fix`
8. `feat(create-visill): template - .claude/skills starter roster`
9. `feat(create-visill): build-template workspace mirror + prepublish guard`
10. `feat(examples): vendored decision-tree consuming workspace SDK`
11. `ci: scaffolder smoke gate + vendored example gate`
12. `docs(adr): 0015 single-prompt, 0016 vendored-example gate, 0017 lockfile policy`

## 11. Dependencies

Depends on:
- Phase 2 (`visill` SDK published shape available via workspace).
- Phase 3 (`@visill/build` plugins importable).
- Phase 4 (vendored chevron drop and `render.py` canonicalised).
- Phase 5 (`@visill/test` helpers available).

Blocks Phase 7 (per-repo migration of the three existing skills, which consume the scaffolder output and vendored example as reference).

## 12. Risks + mitigations

- **Workspace-protocol leak into published tarball**: template carries real semver; prepublish guard greps for `workspace:`; tarball-install CI step exercises the published shape.
- **Cross-platform path handling**: scaffolder uses `node:path` exclusively, never string concat; CI matrix adds `windows-latest` for the scaffolder unit tests (Gate 1 stays Linux for cost).
- **`__pycache__` committed accidentally**: `.gitignore` covers `__pycache__/` and `*.pyc`; `build-zip.sh` already excludes them; Gate 1 asserts absence in the produced zip.
- **Template drift from canonical patterns**: the vendored example is the canary; any framework regression breaks its bundle test before publish.
- **Sentinel collision with legitimate `<<` in markdown**: sentinel format `<<UPPER_SNAKE>>` plus a build-step grep restricted to that pattern.

## 13. Open questions

- Dev-aid `.claude/skills/` roster: ship all three (`audit-description-length`, `verify-tokens-replaced`, `run-evals`) or just `audit-description-length` for v0.1? Lean: ship all three; the latter two are thin.
- License default: MIT or Apache-2.0. Existing repos use MIT; lean MIT, confirm before tagging v0.1.
- Should the scaffolder ask a question, or infer the name from the positional arg (`npm create visill hello` -> name `hello`)? Lean: infer from the positional arg, prompt only when absent. Section 5 already encodes this; flagged here for sign-off.
