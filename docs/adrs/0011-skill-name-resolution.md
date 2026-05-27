# ADR 0011 - Skill-name resolution

- Status: Accepted
- Date: 2026-05-27

## Context

Three existing widget repos derive the skill folder name from `package.json#name` by stripping a `claude-skill-` prefix. `claude-skill-decision-tree/scripts/build-zip.sh` line 7 is the canonical seed:

```bash
SKILL_NAME=$(node -p "require('./package.json').name.replace(/^claude-skill-/, '')")
```

The visill scaffolder and any skills it generates use the `visill-` prefix. The migration in Phase 8 keeps the existing repos on their `claude-skill-` names until each chooses to rename, so any single repo on `@visill/build` v0.1 may carry either prefix. Some authors will also want a skill folder name that diverges from the npm package name, for rebranding or to dodge a name collision on npm.

`@visill/build` needs one canonical resolver so the assembler, the scaffolder, and any future tooling agree on which folder under `skill/` to write. Triplicating the derivation across plugins repeats the very drift the framework exists to fix.

## Decision

`resolveSkillName(repoRoot)` applies a strict precedence:

1. If `${repoRoot}/visill.config.ts` exists and exports `{ name }`, return that name. A named `name` export wins; the default export's `name` field is the fallback. This is the per-repo override.
2. Otherwise read `${repoRoot}/package.json` and take `.name`. Strip a leading `visill-` if present; else strip a leading `claude-skill-`; else use the name as-is.
3. If neither step yields a name, throw `Error("resolveSkillName: no visill.config.ts and no package.json#name at <repoRoot>")`.

The function is async because dynamic-importing `visill.config.ts` requires it. The prefix list is hardcoded `['visill-', 'claude-skill-']` and applied first-match-wins.

## Alternatives considered

- **Configurable `prefixes` option on the resolver.** Rejected for v0.1. Two prefixes cover every known repo. A third has no concrete use case. Reintroduce the option when a fourth prefix appears.
- **A dedicated `skill.json` file.** Rejected. Duplicates fields already in `package.json` and `visill.config.ts`, and creates three sources of truth where two suffice.
- **Silent fallback to the basename of `repoRoot`.** Rejected. Silent fallbacks ship skills under surprising names and produce confusing assembly output. The explicit throw forces the author to configure one or the other.
- **Synchronous resolution by reading `visill.config.ts` as text and matching `name` with a regex.** Rejected. Brittle against any TypeScript beyond a literal object expression. Dynamic import respects the user's actual export, including computed values and re-exports.

## Consequences

- Existing `claude-skill-*` repos migrate to `@visill/build` without renaming. The strip rule keeps them working until they choose to adopt the `visill-` prefix.
- `visill.config.ts` is the escape hatch for any future case: npm name collision, rebrand, or a folder name that simply differs from the package name. Authors who never need an override never write the file.
- The resolver is async. Callers `await` it. The fixture `vite.config.ts` and the scaffolder both use top-level await or a small helper.
- A repo with no `package.json#name` and no `visill.config.ts` fails loudly at the first build. This is the intended behaviour; the alternative is a skill that ships under the empty string.

## References

- [docs/prds/003-phase-3-visill-build.md](../prds/003-phase-3-visill-build.md) §7 (precedence), §12 (open question on configurable prefixes).
- `claude-skill-decision-tree/scripts/build-zip.sh` line 7 - the historical seed.
- ADR 0010 - the assembler that consumes the resolved name.
