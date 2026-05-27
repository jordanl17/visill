---
number: 0022
title: Evals run locally only, never in CI
status: Accepted
date: 2026-05-27
phase: 6 (constraint surfaces in template workflow content)
---

## Context

Each existing skill repo (`claude-targettable-feedback`, `claude-skill-decision-tree`, `claude-skill-linear-editing`) treats evals as a local developer workflow:

- `tests/evals/` ships per-skill assertions (`grade.ts`), live preview aggregation (`build_preview.ts`), an orchestrator prompt (`orchestrator.md`), and the eval cases (`evals.json`).
- Their GitHub Actions workflows (`build.yml`, `release.yml`) ignore evals, grading, and the orchestrator. They run bundle integrity tests, the render test, and the build.
- Evals drive a live Claude subagent loop (orchestrator plus Edit/Write subagents), which is non-deterministic, slow, expensive in tokens, and unfit for CI gating.

Visill codifies this convention. Phase 5's `@visill/test` ships eval helpers (`loadEvals`, `assertion`, `summarize`, `parseDataIslandFromHtml`) as library code, unit-tested in CI like any other helper. Phase 6's scaffolded template `build.yml` and `release.yml` must never invoke `tests/evals/*`.

The monorepo's own CI follows the same rule: the vendored `examples/decision-tree/` workspace package (Phase 6) runs only its bundle and render tests in the root `ci.yml`. Its eval suite stays out of monorepo CI.

## Decision

Evals run locally only. CI never executes any code under `tests/evals/`.

Concrete obligations:

1. The scaffolded template's `.github/workflows/build.yml` runs `pnpm test` scoped to `tests/widget/` only (or equivalent: vitest config excludes `tests/evals/**` from CI runs).
2. The scaffolded template's `.github/workflows/release.yml` does not invoke any eval step. It builds, zips, and uploads.
3. The visill monorepo's `ci.yml` job for `examples/decision-tree/` runs `pnpm -F decision-tree test` with a vitest project config that excludes the eval suite, or scopes to `tests/widget/`.
4. `@visill/test`'s own unit tests (testing the eval helpers themselves) run in CI - these are testing library behaviour on fixture data, not orchestrating live subagents.
5. The scaffolded template's `package.json` provides two scripts: `test` (CI-safe, widget tests only) and `test:evals` (local-only, runs the eval suite). README documents the split.

## Alternatives considered

- **Run evals in CI on a schedule (cron)** - rejected. Live Claude API calls cost too much, non-determinism makes the signal noisy, and a red eval gives no actionable blocker.
- **Run evals in CI behind a label or manual dispatch** - rejected as over-engineering for v0.1. Authors who want it can add it per-skill.
- **Stay silent in framework docs and let authors decide** - rejected. All three existing repos converged on local-only; stating the rule stops the next author from wiring evals into CI and burning the API bill.

## Consequences

- The framework ships no "CI eval gate" feature for v0.1. The Phase 5 PRD already lists it as out of scope.
- Authors who want CI evals add the workflow step themselves; the framework provides no scaffold.
- `build.yml` stays cheap and fast; `release.yml` stays deterministic.
- Vitest config keeps `tests/evals/` out of CI runs; git still tracks the directory.

## References

- `docs/design/visill-overview.md` Scope Boundaries: "Generalised eval grader" listed as out-of-scope for v0.1.
- `docs/prds/005-phase-5-visill-test.md` - Eval helpers are library code.
- `docs/prds/006-phase-6-create-visill-and-examples.md` - Template `build.yml` content must reflect this constraint.
- `claude-skill-decision-tree/.github/workflows/build.yml` - empirical confirmation: no eval invocation.
- `claude-skill-linear-editing/.github/workflows/build.yml` - same.
- `claude-targettable-feedback/.github/workflows/build.yml` - same.
