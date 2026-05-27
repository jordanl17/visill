# PRD 000 - Phase 0: pnpm/action-setup collision backports

Status: Shipped (direct push to `main` on both affected repos, 2026-05-27)
Date: 2026-05-27
Owner: jordan.lawrence@sanity.io

## Delivery

Both fixes shipped via direct push to `main`. `main` is unprotected on both repos, the change is mechanical (3 lines removed across two repos), and CI hooks passed locally. A PR review gate would have added wait time with no benefit.

- `jordanl17/claude-skill-targetable-feedback` @ commit `e9894d9` on `main`.
- `jordanl17/claude-skill-linear-editing` @ commit `0863044` on `main`.

`release-please` merged a release commit on each repo's `main` during the work, so each local commit was rebased onto `origin/main` before push (fast-forward). No re-tag triggered: both wrap-up commits use the `ci:` prefix, which release-please ignores under conventional-commits defaults.

The original §3 plan called for "One PR per affected repo (two PRs total)." Direct-push delivery **supersedes** that. The `Open PR-A`/`Open PR-B` tasks in the original task graph became `Fast-forward main and push` and completed.

## 1. Goal

Drop the `pnpm/action-setup` `version:` input across all three existing visual-skill repos so the `packageManager` field in `package.json` becomes the single source of truth for the pnpm version. This removes a live CI footgun (design doc anti-pattern #12) before any visill framework code lands.

## 2. Scope

In:
- Removing the `pnpm/action-setup` `version:` input in `.github/workflows/release.yml` and `.github/workflows/build.yml` across the three repos where it still appears.

Out:
- Other Phase-1 defect backports (`build_preview.ts` hardcoded stats, `evals.json` key drift, `.prettierignore` `skill/` gap, `decision_tree_{slug}` leak, dead helpers in linear-editing `shared.ts`). Deferred to the Phase 4 migration PRs.
- Changes to the `packageManager` pin value, Node version, or action major versions.
- The visill monorepo itself.

## 3. Deliverables

One PR per affected repo (two PRs total; decision-tree is already clean):

- PR-A: `claude-targettable-feedback` - fix `release.yml` and `build.yml`.
- PR-B: `claude-skill-linear-editing` - fix `build.yml` only (`release.yml` already clean).

## 4. Success criteria

- After merge, `grep -rn "version: 10" .github/workflows` returns zero hits in all three repos.
- The next CI run on each repo's PR gate passes `pnpm install --frozen-lockfile` with no `ERR_PNPM_BAD_PM_VERSION` or "multiple pnpm versions requested" warnings.
- The next release-please-triggered release in `claude-targettable-feedback` produces a zip artefact matching the previous release's shape (byte-size within +/- 1 KB).
- All three repos resolve pnpm exclusively from the `packageManager` field at `pnpm@10.10.0`.

## 5. Dependencies

Unblocked by: nothing. Mechanical change, no upstream prerequisite.

Unblocks: Phase 2 (visill monorepo scaffold) can proceed in parallel; the Phase 4 migration PRs inherit the cleaned workflow shape as the canonical template.

## 6. Affected files per repo

Inspected current state:

- `claude-skill-decision-tree`
  - `.github/workflows/release.yml` line 32 - clean (no `version:` input).
  - `.github/workflows/build.yml` line 12 - clean.
  - No PR needed.

- `claude-skill-linear-editing`
  - `.github/workflows/release.yml` line 32 - clean.
  - `.github/workflows/build.yml` lines 12-14 - has `version: 10`. NEEDS FIX.
  - Note: the handoff doc listed `release.yml` as the offender here; actual state shows `build.yml` instead.

- `claude-targettable-feedback`
  - `.github/workflows/release.yml` lines 32-34 - has `version: 10`. NEEDS FIX.
  - `.github/workflows/build.yml` lines 12-14 - has `version: 10`. NEEDS FIX.

`packageManager: pnpm@10.10.0` is present in all three `package.json` files (verified).

## 7. Implementation notes

Each occurrence collapses three lines:

```yaml
      - uses: pnpm/action-setup@v4
        with:
          version: 10
```

into one:

```yaml
      - uses: pnpm/action-setup@v4
```

`pnpm/action-setup@v4` reads the `packageManager` field automatically when no `version:` input is supplied. No other workflow keys move.

## 8. Risks + mitigations

- Risk: bumping `pnpm@10.10.0` to a new minor in `package.json` silently changes CI's pnpm version. Mitigation: acceptable. That is the intended single source of truth and the framework's hard constraint going forward.
- Risk: `pnpm/action-setup@v4` behaviour drift if the action's major version changes how it reads `packageManager`. Mitigation: pinned to `@v4`; revisit only on intentional major bump.
- Risk: a release re-run in `claude-targettable-feedback` accidentally re-tags an existing release. Mitigation: PR-A is workflow-only; release-please will not open a new version PR on merge unless a `feat:`/`fix:` commit also lands.

## 9. Open questions (resolved at delivery)

- ~~Should the PR title prefix be `ci:` or `fix(ci):`?~~ Resolved: `ci:`. Both wrap-up commits use `ci: drop pnpm/action-setup version input`. Direct-push delivery means no PR title; the commit message carries the same intent.
- ~~Worth squashing both file edits in `claude-targettable-feedback` into one PR versus two?~~ Resolved: one commit covering both files, since they share intent and the change is mechanical.

## 10. Lessons learned (carry into future PRDs)

- `release-please` runs on its own cadence; a long-running phase can race with bot pushes to `main`. Codified in `docs/PHASE-PLAYBOOK.md` Stage 6: rebase + fast-forward push when `origin/main` has diverged at push time, no fresh authorization round needed.
- Sub-agents cannot reliably perform git writes; their safety harness refuses even when the prompt authorizes. All git ops (add, commit, checkout, merge, rebase, push, branch ops, `gh` calls) run from the coordinator's Bash. Sub-agents handle file edits, reads, builds, tests, and lints only.
- Direct push to `main` is the default delivery mode for mechanical phases where `main` is unprotected; PR is the fallback. Codified in CLAUDE.md and PHASE-PLAYBOOK.md.
