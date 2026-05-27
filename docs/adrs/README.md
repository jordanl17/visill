# ADRs

Architecture Decision Records. Append-only. Each ADR is numbered, dated, and carries Context / Decision / Alternatives considered / Consequences / References sections. Status is `Proposed`, `Accepted`, `Superseded by NNNN`, or `Deprecated`.

This file is the canonical index and numbering authority. When a PRD references an ADR number that conflicts with this index, the index wins; correct the PRD in its phase when authoring the ADR.

## Numbering plan

Block | Range | Lands in
---|---|---
Meta (no code) | 0001-0008 | Phase 1 (one docs commit)
SDK | 0009 | Phase 2
Vite plugins | 0010-0011 | Phase 3
Render runtime | 0012-0013 | Phase 4
Test helpers | 0014-0015 | Phase 5
Scaffolder + template | 0016-0018 | Phase 6
Release + migration | 0019-0021 | Phase 7-8
Cross-cutting constraints | 0022+ | as needed

## Index

| # | Title | Phase | Status |
|---|---|---|---|
| 0001 | Bundler - Vite + `vite-plugin-singlefile` | 1 | Pending |
| 0002 | Monorepo with Changesets, independent semver | 1 | Pending |
| 0003 | Single full-featured template | 1 | Pending |
| 0004 | `render.py` stdin contract | 1 | Pending |
| 0005 | Dev-aid skills in `.claude/skills/` | 1 | Pending |
| 0006 | Gitignore built `skill/` directory | 1 | Pending |
| 0007 | Description 1024-char cap | 1 | Pending |
| 0008 | pnpm pin via `packageManager` field | 1 | Pending |
| 0009 | SDK public API surface | 2 | Accepted |
| 0010 | `finalizeBundle` HTML rewrites | 3 | Accepted |
| 0011 | Skill-name resolution precedence | 3 | Accepted |
| 0012 | `render.py` JSON-island encoding (`</` neutralisation, `_json` siblings) | 4 | Accepted |
| 0013 | Vendored chevron strategy | 4 | Accepted |
| 0014 | Bundle-test preset shape | 5 | Accepted |
| 0015 | Render-test via Python subprocess | 5 | Accepted |
| 0016 | Scaffolder single-prompt UX | 6 | Accepted |
| 0017 | Vendored example as integration gate | 6 | Accepted |
| 0018 | Template-shipped lockfile and ignore policy | 6 | Accepted |
| 0019 | RC publish via Changesets prereleases | 7 | Pending |
| 0020 | Migration branch + `pnpm.overrides link:` strategy | 8 | Pending |
| 0021 | Parity gates for migration PRs | 8 | Pending |
| 0022 | Evals run locally only, never in CI | 6 | Pending |
| 0023 | tsup for ESM dist emission | 6 | Accepted |

## PRD ↔ ADR drift to fix at authoring time

- `docs/prds/003-phase-3-visill-build.md` references ADR 0008 for skill-name resolution; the canonical number is **0011**.
- `docs/prds/004-phase-4-canonical-render-py.md` references ADRs 0011 + 0012; the canonical numbers are **0012 + 0013**.
- `docs/prds/005-phase-5-visill-test.md` references ADRs 0013 + 0014; the canonical numbers are **0014 + 0015**.
- `docs/prds/006-phase-6-create-visill-and-examples.md` references ADRs 0015 + 0016 + 0017; the canonical numbers are **0016 + 0017 + 0018**.
- `docs/prds/007-phase-7-10-release-and-migration.md` references ADRs 0018 + 0019 + 0020; the canonical numbers are **0019 + 0020 + 0021**.

The PRDs are sized to be read standalone, so these are left uncorrected there. Pull the PRD and this index together when authoring the ADR.
