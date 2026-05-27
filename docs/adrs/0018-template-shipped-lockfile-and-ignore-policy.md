# ADR 0018: Template-shipped lockfile and ignore policy

- Status: Accepted
- Date: 2026-05-27

## Context

The `create-visill` scaffolder produces a self-contained skill repo. Each scaffolded repo is single-package - one `package.json` at the repo root - and not a monorepo. The author picks a package manager (pnpm, npm, yarn, or bun) and runs the first install themselves.

Two questions fall out of that setup:

1. **Lockfile.** Should the template ship `pnpm-lock.yaml`? A pre-shipped lockfile gets stale at the moment the scaffolder package is published, and authors who pick npm, yarn, or bun would have to delete it before their first install.
2. **Ignore files.** The three pre-existing skill repos (`claude-skill-decision-tree`, `claude-skill-linear-editing`, `claude-targettable-feedback`) converge on a specific `.gitignore`, `.prettierignore`, and `.oxlintrc.json` shape. PRD 006 §3.B enumerates the pattern sets verbatim; this ADR locks in the rationale so future scaffolder edits do not drift.

CHANGELOG handling is the third corner: release-please owns the CHANGELOG, and prettier reformatting it would conflict with release-please's edits on every release.

## Decision

The scaffolded template ships **no** `pnpm-lock.yaml`. Authors generate one on first install with whichever package manager they prefer.

The scaffolded template ships these three files verbatim, sourced from PRD 006 §3.B.

`.gitignore`:

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

`.prettierignore`:

```
node_modules/
skill/
*-workspace/
dist/
pnpm-lock.yaml
CHANGELOG.md
```

`.oxlintrc.json`: the canonical config used by all three existing skills. Categories: `correctness=error`, `perf=warn`, `restriction=off`, `style=off`, `suspicious=warn`. Rules: `no-unused-vars=warn`, `eqeqeq=error`, `no-debugger=error`, `no-console=off`. `ignorePatterns` covers `node_modules/`, `skill/*/assets/widget-bundled.html`, `*-workspace/`, `dist/`.

The two losing lockfiles (`package-lock.json`, `yarn.lock`) are gitignored explicitly so that a leftover from a prior tool sitting next to a fresh `pnpm-lock.yaml` cannot poison the install.

## Alternatives considered

- **Ship `pnpm-lock.yaml`.** Rejected. Locks downstream skills into a single package manager; npm/yarn/bun authors must delete it before their first install; pnpm authors inherit a lockfile pinned at the scaffolder publish date.
- **Leave lockfile choice fully to the author with no ignore for any lockfile.** Rejected. A leftover `package-lock.json` from a prior tool sitting beside a fresh `pnpm-lock.yaml` is the failure mode that breaks `pnpm install` by default. Explicit ignore for the two losing lockfiles is the safe baseline.
- **Per-author tweakable ignore via additional sentinel substitution.** Rejected. The pattern sets are canonical across all three existing skills; further per-author variance is yak-shaving.
- **Skip `.oxlintrc.json` and let authors choose a linter.** Rejected. Oxlint is the workspace standard, the three existing skills already use it, and shipping the canonical config saves authors a research step.

## Consequences

- Scaffolded skills install cleanly with pnpm, npm, yarn, or bun on first try.
- The CHANGELOG (release-please-owned) is never touched by prettier, so release-please's edits stay conflict-free.
- The `*-workspace/` glob covers Claude Code session workspaces, matching the three skill repos' convention.
- `.husky/_/` is ignored because husky regenerates that subtree; the committed `.husky/pre-commit` (if any) stays tracked.
- Authors who deliberately want a committed lockfile remove `pnpm-lock.yaml` from `.prettierignore` and adjust `.gitignore` for their chosen package manager.
- The `.oxlintrc.json` `ignorePatterns` entry for `skill/*/assets/widget-bundled.html` only matches inside the build output and stays inert until `pnpm build` populates it.

## References

- [PRD 006 §3.B](../prds/006-phase-6-create-visill-and-examples.md#3-deliverables) - canonical enumeration of the three ignore files, lifted verbatim from the three skill repos.
- [PRD 006 §12](../prds/006-phase-6-create-visill-and-examples.md#12-risks--mitigations) - risk mitigations for `__pycache__` commit and template drift.
- Memory anchor: Phase 5 surveyed the three skill repos for ignore-pattern convergence; the PRD 006 §3 amendment landed in commit `c29d546`.
- Lift sources: `../claude-skill-decision-tree`, `../claude-skill-linear-editing`, `../claude-targettable-feedback`.
