# ADR 0008 - pnpm pin via packageManager field

- Status: Accepted
- Date: 2026-05-27

## Context

pnpm version drift between local development and CI causes "works locally, fails in CI" bugs. Node and pnpm tooling read the `packageManager` field in package.json via corepack to pin the version. A single declarative pin replaces parallel version flags scattered across workflows.

## Decision

The root package.json `packageManager` field is the canonical pnpm pin. CI workflows enable corepack and omit `version:` on pnpm/action-setup.

## Alternatives considered

- **`version:` on pnpm/action-setup** - rejected. Two places to bump; they drift.
- **No pin at all** - rejected. CI installs floating-latest; local installs whatever corepack last cached. Reproducibility collapses.

## Consequences

- One bump location per repo: package.json's packageManager field.
- CI step shortens to `pnpm/action-setup@v4` with no version.
- Phase 0 already backported this approach to the three existing skill repos.

## References

- [docs/prds/000-phase-0-release-yml-backports.md](../prds/000-phase-0-release-yml-backports.md)
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
