# PRD 007 - Phases 7-10: RC release and migration of the three existing skill repos

Status: Proposed. Owner: jordan.lawrence@sanity.io. Date: 2026-05-27.

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
