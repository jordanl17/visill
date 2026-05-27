# ADR 0005 - Dev-aid skills in .claude/skills/

- Status: Accepted
- Date: 2026-05-27

## Context

Claude Code agent skills speed up development of visill itself. They live in the repo at `.claude/skills/` so every contributor picks them up on clone. Default Node and editor gitignores often drop the entire `.claude/` tree, which would erase these skills from version control.

## Decision

Track `.claude/` in this repo. The root `.gitignore` deliberately omits it.

## Alternatives considered

- **Ignore `.claude/` wholesale** - rejected. Loses the dev-aid skills that future contributors depend on.
- **Move skills under a different path** - rejected. Claude Code looks in `.claude/` by convention; relocating fights the tool.

## Consequences

- New skills land via PR like any other code.
- Root `.gitignore` must not include `.claude/`.
- Built skill output goes to `./skill/`, which is ignored - see ADR 0006.

## References

- [ADR 0006](0006-gitignore-built-skill-dir.md)
- [.gitignore](../../.gitignore)
