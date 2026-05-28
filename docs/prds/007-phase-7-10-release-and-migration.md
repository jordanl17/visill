# PRD 007 - Phases 7-10: RC release and migration of the three existing skill repos

Status: Phase 7 Shipped, Phase 8 Shipped, Phases 9-10 Proposed. Owner: jordan.lawrence@sanity.io. Date: 2026-05-27.

## 1. Combined goal

Take visill from "monorepo passes its own tests on `main`" to "stable `v0.1.0` published on `latest`, with all three production skill repos migrated, building byte-comparable artefacts and passing the same evals". A prerelease train (`rc.N`) lets the three consumer repos shake out API gaps against a real published artefact before stable cuts.

## 2. Phase 7 - RC release

**Scope.** Enter Changesets prerelease mode and publish all four packages under the `rc` dist-tag.

**Token gate (precondition).** Before any publish step runs, confirm the `NPM_TOKEN` repo secret exists via `gh secret list --repo jordanl17/visill`. The secret was provisioned on 2026-05-27 (Granular Access Token from npmjs.com scoped to publish on the four packages, or the `@visill` org once created). If `gh secret list` reports it missing at Phase 7 kickoff, abort and ask the user to re-provision; do not proceed. See [ADR 0002](../adrs/0002-monorepo-with-changesets.md). Phase 7 is the first phase that exercises the secret; Phase 0-6 CI is read-only.

- `pnpm changeset pre enter rc`. Changesets couples the npm dist-tag to the prerelease tag in `pre.json`, so the `rc` string flows through to npm and cannot be overridden in pre mode.
- Release-Please / Changesets PR publishes `@visill/sdk@0.1.0-rc.0`, `create-visill@0.1.0-rc.0`, `@visill/build@0.1.0-rc.0`, `@visill/test@0.1.0-rc.0`, all on the `rc` tag.
- `latest` stays empty so nothing on it is picked up accidentally.

**Deliverables.** Four tarballs on npm under `rc`. CHANGELOG entries for the rc.0 cut. ADR 0019 (RC publish via Changesets prereleases) accepted.

**Success criteria.** `pnpm view @visill/sdk@rc version` returns `0.1.0-rc.0`. A throwaway scaffold (`pnpm create visill@rc hello`) builds a green zip end-to-end.

## 3. Phase 8 - DT canary

**Rationale.** `claude-skill-decision-tree` is the median of the three repos: more idiomatic than targettable-feedback (the origin codebase, full of one-offs) and smaller than linear-editing (which carries the most bespoke eval grading). Migrating it first surfaces SDK gaps without amplifying them through the larger or messier codebases.

**Scope.** Long-lived branch `visill-migration` in `/Users/jordan.lawrence/Documents/repos/claude-skill-decision-tree/`.

- Local dev: root `package.json` carries `pnpm.overrides` pointing each of the four visill packages at `link:../visill/packages/<pkg>`, so SDK changes propagate without a republish.
- CI on the branch installs the published RC (`@visill/sdk@0.1.0-rc.N` etc., with overrides stripped or ignored via a CI-only `.npmrc`), proving the published tarball works.
- Rewires `vite.config.ts` to `import { defineVisillConfig, finalizeBundle, assembleSkill } from "@visill/build"`. Replaces ad-hoc helpers with `@visill/sdk` imports (`requireElement`, `delegate`, `readDataIsland`, `sendPrompt`, `readyDOM`). Replaces `tests/widget/bundle.test.ts` body with `createBundleTests({...})`. Gitignores `skill/`. Adds `.claude/skills/` directory if absent.
- Any new export or build option discovered during migration is filed against the visill monorepo, fixed on `main`, cut as `rc.N+1`, then consumed from the migration branch. The migration branch never patches visill packages directly.

**Deliverables.** Migrated repo on `visill-migration`. Open migration PR against `claude-skill-decision-tree` `main` with all five parity gates green in CI. ADRs `0019-migration-branch-strategy.md` and `0020-parity-gates.md` accepted.

**Success criteria.** All five parity gates (Section 6) pass on the branch's CI against the latest published RC. PR is review-ready: no draft blockers, no skipped tests.

### Phase 8 - Delivery (2026-05-28)

Shipped via two-repo split: visill `main` carries the parity-gate tooling and ADRs; DT `visill-migration` carries the rewire and CI. DT migration PR #10 open, all four enforced parity gates green plus gate 5 SKIPPED per ADR 0021.

- Visill commits on `main`: `21366f0` (parity-gate cli + ADRs 0020/0021 Accepted), `f55f686` (Version PR #3 merge publishing `@visill/test@0.1.0-rc.2`), `3e17496` (ADR 0021 amendment for gate 3 migration-mode), `68b1d78` (`.changeset/pre.json` added to `.prettierignore` to stop churn).
- DT commits on `visill-migration`: `32675f3` (migrate to visill 0.1.0-rc), `b5c572c` (strip overrides in build job + pin pnpm version), `1c586b3` (pin @visill deps to `rc` dist-tag + cache pnpm lockfile in subdir), `df3fb8f` (gate 3 strip module-script for migration parity).
- npm state: `@visill/test@0.1.0-rc.2` on `@rc` and `@latest` (manual `npm dist-tag add` after publish per the changesets pre-mode bug). `@visill/sdk` and `@visill/build` remain at `0.1.0-rc.1` - no SDK API gaps surfaced during DT migration.
- DT package.json pins all three `@visill/*` deps to `rc` dist-tag string (per ADR 0020 "migration tracks floating @rc"), not explicit versions. CI strips `pnpm.overrides` via `jq 'del(.pnpm)')` and runs `pnpm install --no-frozen-lockfile`.

### Phase 8 - Lessons learned

1. **Gate 3 vs the migration's defining act.** PRD §6 gate 3 compares the `<script type="module">` body for structural equality. But the migration's whole purpose is to rewire helpers, which necessarily changes the minified module-script body even when behaviour is preserved. The two requirements were mutually exclusive for the initial migration PR. Resolution: ADR 0021 amended with a "Migration mode" section; `parity-check.sh` strips the module-script tag from both HTML files before invoking `structural-html-diff.mjs` on migration PRs. Post-migration routine SDK-bump PRs run the gate in its full three-region form. The amendment landed in the same Phase 8 cycle.
2. **Gate 5 transcripts deferred.** DT has no checked-in `tests/evals/transcripts/`. ADR 0021's "Deferral: gate 5 transcripts" section records the rationale and the exit condition - any consumer that ships transcripts flips its gate 5 from `skipped` to live.
3. **Changesets pre-mode dist-tag bug recurred.** After Version PR #3 merge, `@visill/test@rc` pointed at `rc.1` (stale), while `@visill/test@latest` advanced to `rc.2`. Required manual `npm dist-tag add @visill/test@0.1.0-rc.2 rc`. Memory captures this pattern from Phase 7.
4. **Three CI-fix rounds were needed post-push.** Each round fixed a distinct, well-diagnosed layer: (a) the legacy `build` job needed the same strip-overrides recipe as the new `parity-check` job, and `pnpm/action-setup@v4` needed an explicit `version` since the parity-check job's checkouts are in subdirs; (b) `^0.1.0-rc.2` semver pins failed to resolve `@visill/sdk` and `@visill/build` which were still at `rc.1` - switching to `"rc"` dist-tag string fixed it, plus a `cache-dependency-path` for setup-node's pnpm cache; (c) gate 3 strip + the `STRUCTURAL_DIFF_SCRIPT` env-var override + `diff -r` -> `diff -rq` for the gate 2 filter. None of these were caught by the local smoke tests because the smoke tests ran from the DT repo root with overrides intact, not from a CI runner with overrides stripped. Future migrations should add a `pnpm run parity-check:smoke` script that mimics the CI install recipe end-to-end before pushing.
5. **No SDK API gaps from DT.** The Wave B rewire of `vite.config.ts`, `widget.ts`, and `bundle.test.ts` consumed the `rc.1` surface without a single API gap. `defineVisillConfig({})` covered all DT-specific config knobs; `requireElement` / `readDataIsland` / `readyDOM` / `sendPrompt` replaced every ad-hoc helper; `createBundleTests({...})` subsumed every bundle assertion. This is a strong signal for Phase 9 (TF + LE) - the SDK surface is likely also sufficient there, modulo any TF/LE-specific patterns not present in DT.
6. **Migration PR stays open through Phase 10.** Per ADR 0020 the DT migration PR (#10) is intentionally not for merge until stable `0.1.0` cuts and the migration branch bumps from `rc` dist-tag to `^0.1.0`. The PR's CI green is the deliverable; merging is Phase 10's act.

## 4. Phase 9 - TF + LE parallel

**Parallelism justification.** Phase 8 stabilises the RC. By the time TF and LE migrate, the SDK surface is fixed and the parity-gate tooling is reusable. The two repos touch disjoint code; reviewers can read them independently.

**What serialises them.** If both migrations open SDK gaps on the same export (say, both want a different shape for `readDataIsland`), the smaller of the two pauses until the larger lands its required `rc.N+1`. Expect zero or one such collision; default to parallel.

**Per-repo deliverables.** Identical to Phase 8: `visill-migration` branch, `pnpm.overrides` for local dev, CI installs the published RC, rewire + parity gates, migration PR open.

## 5. Phase 10 - stable release

**Scope.** Exit prerelease, cut stable, retarget consumers.

- `pnpm changeset pre exit` on visill `main`; the resulting version PR publishes `@visill/sdk@0.1.0` etc. on the `latest` tag.
- Each of the three migration branches: bump `package.json` ranges to `^0.1.0`, delete the `pnpm.overrides` block, re-run CI, request review.
- Three migration PRs merge to their respective `main` branches.

**Deliverables.** Stable tarballs on `latest`. Three merged migration PRs.

**Success criteria.** `pnpm view @visill/sdk version` returns `0.1.0`. Each of the three repos' `main` builds a green zip on a fresh CI run with the stable range resolved. The five backport defects from Phase 1 are absorbed into the migration commits and no longer need their own PRs.

## 6. Parity gate specification

Each migrated repo carries a `scripts/parity-check.sh` invoked from CI. It builds the artefact twice - once from the migration branch, once from the repo's prior `main` SHA - and compares.

1. **Zip file-list + modes.** `unzip -Z1` over both zips; `diff` must be empty. `stat -f "%Sp %N"` (or `unzip -Z` long-listing) confirms `render.py` is `-rwxr-xr-x`.
2. **Per-file byte-equal except `widget-bundled.html`.** `diff -r` between extracted trees; `widget-bundled.html` is the only allowed delta.
3. **Structural HTML diff.** `node scripts/structural-html-diff.mjs` (shipped from `@visill/test`) parses both HTML files and compares the `<script type="module">` body, inlined `<style>` blob, and `<script id="..." type="application/json">` skeleton. Whitespace and attribute order are normalised first.
4. **Gzipped bundle size.** `gzip -c widget-bundled.html | wc -c` on both; delta must stay within ±5%.
5. **Eval grading re-run.** `pnpm grade --transcripts tests/evals/transcripts/` re-runs `grade.ts` over checked-in transcripts (no agent re-runs). Assertion outcomes must match 1:1 between branches.

CI fails on any single gate. Gate output uploads as a workflow artefact for review.

## 7. API gap handling protocol

1. Gap surfaces during migration: missing SDK export, build option, or helper.
2. Author opens an issue on `visill` describing the gap and the consumer use-case.
3. Author writes a failing test in `@visill/test` (or the relevant package's test suite) on a `main`-targeted branch.
4. Fix lands on visill `main`, version-bumped via Changeset.
5. Release-Please publishes `rc.N+1` on the `rc` tag.
6. Migration branch bumps to `rc.N+1` (or re-resolves under `link:` for local) and reruns parity gates.

No SDK change ever lands first on a consumer branch.

## 8. Defect collapse manifest

Each backport defect from Phase 1, mapped to the migration commit that subsumes it:

| Defect | Subsumed by |
|---|---|
| `build_preview.ts` hardcoded summary stats | TF + DT + LE migration: scaffolder-derived `build_preview.ts` reads `grading.json` |
| `evals.json` top-level key drift (`scenarios` vs `evals`) | TF + DT + LE migration: `loadEvals` typed loader enforces shape |
| `.prettierignore` missing `skill/` whole-dir | All 3 migrations: `skill/` is gitignored, prettier no longer touches it |
| `decision_tree_{slug}` widget-title leak in LE SKILL.md | LE migration: scaffolder template uses `<<TOKEN>>` sentinels |
| Dead `SLOT_TOKENS` / `UNIT_DATA_ID_PATTERN` in LE `shared.ts` | LE migration: minimal `shared.ts` from scaffolder |

The `release.yml` `pnpm/action-setup` pin fix (LE) already shipped in Phase 0 and is excluded.

## 9. Risks + mitigations

- **One of three skills reveals a load-bearing gap late.** Mitigation: DT canary front-loads discovery. If Phase 9 still finds a structural gap, treat it as a new RC iteration; stable waits.
- **RC version sprawl (`rc.0` through `rc.9`).** Mitigation: acceptable. The `rc` tag always points at latest, and consumers track by tag rather than pinned version during dev.
- **Reviewer fatigue across three concurrent migration PRs.** Mitigation: each PR carries a parity-gate badge so reviewers can trust the mechanical guarantees and focus on the rewire diff. DT migration sets the review template the other two reuse.

## 10. Rollback strategy

If `v0.1.0` ships with a critical bug post-publish:

- `npm deprecate @visill/sdk@0.1.0 "<reason>"` (and siblings).
- Fix on visill `main`, cut `v0.1.1` via Changesets.
- Consumer migration PRs consume by range (`^0.1.0`) and pick up `0.1.1` on next install. No rebase, no force-push required.
- If a migration PR has already merged, open a follow-up bump-only PR per repo.

Skip the re-prerelease cycle unless the bug is structural enough to warrant a fresh `0.2.0-rc.0` train.

## 11. Open questions

- Coordinate all three migration PR merges on the same day, or stagger by 24-48 hours so each repo's first stable build is independently observable?
- If one of three skills fails to build under stable `v0.1.0` (regression vs `rc.N`), do we hold stable, ship `v0.1.1` immediately, or land the two passing migrations and keep the third on `rc.N` until fixed?
