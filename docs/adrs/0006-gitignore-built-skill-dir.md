# ADR 0006 - Gitignore built skill/ directory

- Status: Accepted
- Date: 2026-05-27

## Context

`@visill/build` assembles the final widget skill into a top-level `skill/` directory containing `SKILL.md`, the bundled HTML, and supporting assets. The directory is build output, not source. Tracking it in git invites stale artefacts and noisy diffs on every rebuild.

## Decision

The root `.gitignore` lists `skill/`. The directory is a build artefact, regenerated from source on each build.

## Alternatives considered

- **Commit the built `skill/`** - rejected. Build outputs in git create noisy diffs and rot.
- **Different output path (e.g. `dist/skill`)** - rejected. The Claude widget loader expects a top-level `skill/` directory in the scaffolded project.

## Consequences

- `pnpm build` regenerates `skill/` on demand; no manual sync required.
- Source of truth lives in `packages/` and the project source files.
- Distinct from `.claude/skills/` (dev-aid skills, tracked - see ADR 0005).

## References

- [ADR 0005](0005-dev-aid-skills-in-dot-claude.md)
- [.gitignore](../../.gitignore)
