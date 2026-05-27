# PRD 001 - Phase 1: Monorepo Skeleton

Status: Shipped 2026-05-27. Direct push to `main` at `jordanl17/visill` (public). Initial commit `cb31904`; Node 22 bump follow-up landed in the same session. Unblocks Phases 2-6.
Owner: jordan.lawrence@sanity.io
Date: 2026-05-27

## Delivery

- Scaffold commit: `cb31904 chore: scaffold visill monorepo skeleton` - 40 files, 1567 insertions.
- First CI run on `main`: green in 17s (build/lint/test/prettier all pass on Node 22).
- Visill repo: `github.com:jordanl17/visill` (public). `origin` was already configured at session start; the local `main` was tracking a stale `origin/master` reference, which the push to `origin/main` resolved.
- NPM_TOKEN setup deferred to Phase 7 per [ADR 0002](../adrs/0002-monorepo-with-changesets.md) and [PRD 007](007-phase-7-10-release-and-migration.md).

## Lessons learned

- **Verify remote state before assuming it.** The handoff doc said visill had no GitHub remote yet; in fact `jordanl17/visill` existed and `origin` was configured. Always run `git remote -v` and `gh repo view` before drafting delivery questions about repo setup.
- **Node version bump caught by CI annotation, not by gate.** GitHub Actions surfaced a deprecation note that the actions internally still run on Node 20 (forced upgrade June 2026). We bumped our runtime to Node 22 (current active LTS) in the same session; the action versions themselves remain on v4, which is fine.
- **Prettier with `semi: false` will rewrite scaffolded files.** Sub-agents that emit `export {};` produce a prettier diff. Run `pnpm prettier --write .` once during wrap-up rather than re-prompting agents.
- **Coordinator-owned ADR cross-link fix.** A sub-agent wrote `docs/README.md` before the ADR files existed and pointed every ADR link at the index. The Wave 1 review caught it; the coordinator fixed it in-thread. Future scaffold phases should sequence the index after the linked files exist, or pass `--exists-check` instructions to the index author.

## 1. Goal

Stand up the visill monorepo with tooling, CI, docs scaffolding, and four empty package placeholders so later phases can land SDK, build plugins, scaffolder, and test preset code against a green, lint-clean baseline.

## 2. Scope

In:
- pnpm workspaces plus Changesets with independent semver per package.
- Root TypeScript, prettier, oxlint, gitignore, npmrc config.
- GitHub Actions CI workflow (`install`, `-r build`, `-r lint`, `-r test`).
- Four empty package placeholders (`package.json`, `tsconfig.json`, empty `src/index.ts`).
- Docs tree: `docs/README.md`, eight ADR placeholders, five `docs/rejected/` placeholders.
- Root `CLAUDE.md` pointing at `docs/` without inlining.

Out:
- Runtime code in the four packages.
- Release workflow (no published packages yet; defer to Phase 6).
- Dev-aid `.claude/skills/` content (Phase 4 scaffolder work).
- Template assets, Vite plugins, eval helpers (Phases 2-5).
- Backports to the three existing skill repos (parallel Phase 0 track).

## 3. Deliverables

Root config:
- `pnpm-workspace.yaml`
- `package.json` (root, private, `packageManager: pnpm@10.x.y`, `engines.node: >=20.11.0`)
- `tsconfig.base.json`
- `.changeset/config.json`
- `.gitignore` (node_modules, dist, `skill/`, `.DS_Store`, but keeps `.claude/`)
- `.npmrc`
- `.prettierrc`, `.prettierignore`
- `.oxlintrc.json`
- `.github/workflows/ci.yml`
- `CLAUDE.md`

Docs:
- `docs/README.md` (index linking design / adrs / rejected)
- `docs/adrs/0001-bundler-vite.md`
- `docs/adrs/0002-monorepo-with-changesets.md`
- `docs/adrs/0003-single-full-featured-template.md`
- `docs/adrs/0004-render-py-stdin-contract.md`
- `docs/adrs/0005-dev-aid-skills-in-dot-claude.md`
- `docs/adrs/0006-gitignore-built-skill-dir.md`
- `docs/adrs/0007-description-1024-char-cap.md`
- `docs/adrs/0008-pnpm-pin-package-manager-field.md`
- `docs/rejected/parcel-bundler.md`
- `docs/rejected/state-primitive.md`
- `docs/rejected/eval-cli.md`
- `docs/rejected/brand-tokens.md`
- `docs/rejected/schema-to-form.md`

Packages (each: `package.json`, `tsconfig.json` extending base, `src/index.ts` as empty barrel `export {}`):
- `packages/visill/` - name `visill`
- `packages/create-visill/` - name `create-visill`
- `packages/visill-build/` - name `@visill/build`
- `packages/visill-test/` - name `@visill/test`

## 4. ADR backfill list

Land in Phase 1 (meta decisions, no code touched):
1. `0001-bundler-vite.md` - Vite plus `vite-plugin-singlefile`, rejecting Parcel and Rolldown.
2. `0002-monorepo-with-changesets.md` - single repo, Changesets, independent semver.
3. `0003-single-full-featured-template.md` - one canonical scaffold flavour, not tiered.
4. `0004-render-py-stdin-contract.md` - JSON via stdin only; never argv or temp file.
5. `0005-dev-aid-skills-in-dot-claude.md` - `.claude/skills/` removed from default gitignore.
6. `0006-gitignore-built-skill-dir.md` - assembled `skill/` is a build artefact, not source.
7. `0007-description-1024-char-cap.md` - SKILL.md frontmatter description hard limit with a build-time validator.
8. `0008-pnpm-pin-package-manager-field.md` - `packageManager` field is the canonical pin; workflows omit `version:`.

Defer to later phases (land WITH implementation commit):
- SDK shape (Phase 3, with `packages/visill/`).
- `@visill/build` plugin contracts (Phase 3).
- `@visill/test` preset shape (Phase 5).
- Vendored chevron policy (Phase 4 scaffolder).
- `visill.config.ts` source-of-truth (Phase 4).
- Skill-name derivation rule (Phase 4).

## 5. Success criteria

- `pnpm install` succeeds on a clean clone.
- `pnpm -r build` exits 0 across all four packages (a no-op given empty barrels).
- `pnpm -r test` exits 0 (no tests present, vitest absent or short-circuit script).
- `pnpm -r lint` (oxlint) passes across the tree.
- `pnpm prettier --check .` passes.
- GitHub Actions CI is green on push to `main` and on PR.
- `docs/README.md` resolves links to all eight ADRs and five rejected docs.
- No npm publish attempted; no release workflow present.

## 6. Commits within this phase

Proposed boundaries:
1. `chore: pnpm workspace + root package.json + tsconfig base`
2. `chore: prettier + oxlint + gitignore + npmrc`
3. `chore: changesets config`
4. `ci: github actions skeleton`
5. `chore: package placeholders for visill, create-visill, @visill/build, @visill/test`
6. `docs: README, ADR 0001-0008, rejected/ entries, root CLAUDE.md`

Order matters for green CI: workspace and packages must exist before CI runs `-r build`.

## 7. Dependencies

- Depends loosely on Phase 0 (defect backports in the three existing repos). Phase 1 can begin in parallel; only the migration phase (Phase 6) requires Phase 0 done.
- Blocks Phase 2 (SDK), Phase 3 (`@visill/build`), Phase 4 (scaffolder plus template), Phase 5 (`@visill/test`), and Phase 6 (migration PRs). All need workspace, CI, and docs structure in place.

## 8. Risks + mitigations

- npm name `visill` may be taken. Mitigation: the skeleton uses the bare name in `package.json` without publishing; verify availability before any Phase 6 release. Fallback `@visill/sdk` plus `@visill/create` documented in design doc open items.
- The three-vs-four-package split could flatten later. Mitigation: keep four placeholders now; collapsing into sub-paths is mechanical and lands with an ADR if reversed.
- pnpm 10.x patch version may drift between local and CI. Mitigation: the `packageManager` field pins the exact patch; CI reads it via corepack.
- oxlint maturity lags eslint. Mitigation: scope rules conservatively; revisit during Phase 3 when real code lands.

## 9. Open questions

- License choice: MIT or Apache-2.0. The three existing repos vary. Decide before the Phase 4 scaffolder hardcodes a `LICENSE` template.
- Exact `packageManager` version pin: latest stable pnpm 10.x at scaffold time, or match the three existing repos for parity. Lean: latest stable.
- Scaffolder prompt scope (deferred to Phase 4, flagged here): skill name plus description placeholder plus author only, or richer? Design doc leans minimal.
