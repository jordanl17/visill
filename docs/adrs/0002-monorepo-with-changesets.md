# ADR 0002 - Monorepo with Changesets, independent semver

- Status: Accepted
- Date: 2026-05-27

## Context

visill ships four packages: `@visill/sdk` (widget runtime), `create-visill` (scaffolder), `@visill/build` (Vite plugins), and `@visill/test` (Vitest preset). Each evolves at its own cadence - the runtime stabilises early, while the scaffolder and build plugins churn through Phase 1-10. They share TypeScript config, lint rules, and test setup, and some changes (e.g. a runtime event shape) span more than one package and must land atomically.

## Decision

Use a single pnpm workspace with Changesets driving versions and changelogs. Each package carries its own semver line: `linked: []` and `fixed: []` in `.changeset/config.json`.

## Alternatives considered

- **Multi-repo (one repo per package)** - rejected. Cross-cutting refactors and shared config become painful.
- **Fixed-version monorepo** - rejected. Forces lockstep bumps that do not reflect the packages' real coupling.

## Consequences

- Each package has its own version line and CHANGELOG.
- A single PR can bump several packages atomically when needed.
- pnpm workspace handles internal linking between packages.
- Publishing to npm requires an `NPM_TOKEN` GitHub Actions secret on the visill repo. Phase 1 does not need it - CI is read-only and never publishes. The release workflow lands in Phase 7 (see [PRD 007](../prds/007-phase-7-10-release-and-migration.md) and forthcoming ADR 0019). The secret is configured on `jordanl17/visill` as of 2026-05-27, so the Phase 7 token gate is already satisfied; the coordinator still re-checks via `gh secret list --repo jordanl17/visill` at kickoff and aborts if missing.

## References

- [.changeset/config.json](../../.changeset/config.json)
- [PRD 007 - RC release and migration](../prds/007-phase-7-10-release-and-migration.md)
