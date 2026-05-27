# ADR 0025: Skill name resolved from package.json#name only

- Status: Accepted
- Date: 2026-05-27

## Context

ADR 0011 specified `visill.config.ts` as a per-repo override and the implementation used `await import()` against the `.ts` file. Node cannot load `.ts` natively. The bug stayed latent under vitest, which patches the loader, and behind the decision-tree example, which ships no `visill.config.ts`. Phase 6.1's `defineVisillConfig` upgrade made every scaffolded skill exercise the broken path. The integration gate caught it before the override saw real downstream use.

## Decision

`resolveSkillName(repoRoot)` reads `${repoRoot}/package.json`. When `.name` is a non-empty string, strip a leading `visill-` then `claude-skill-` and return the remainder. Otherwise throw. No `visill.config.ts` path remains. The function keeps its async signature for API stability and to leave room for future async resolution paths.

## Alternatives considered

- **Keep the override via esbuild or `tsx` transpile of `visill.config.ts`.** Rejected: adds a heavyweight runtime dependency for a feature with no demonstrated user.
- **Switch to `visill.config.json`.** Rejected: duplicates `package.json#name` with no proven use case, and introduces a third source of truth (cf ADR 0011's own rejected `skill.json` line).
- **Reorder so `package.json` wins first and `visill.config.ts` becomes a fallback.** Rejected: leaves a known-broken code path in the public surface; users hitting it would see a confusing Node loader error.

## Consequences

- ADR 0011 is superseded.
- The scaffolder template no longer ships `visill.config.ts`.
- Authors who need a folder name that diverges from `package.json#name` have no escape hatch until a concrete use case justifies reintroducing one. A future ADR can revisit when such a case appears.
- `resolveSkillName` stays async so `defineVisillConfig`'s `Promise<UserConfig>` return type does not churn.

## References

- ADR 0011 (superseded by this ADR).
- [docs/prds/003-phase-3-visill-build.md](../prds/003-phase-3-visill-build.md) §7-8 (amended via this ADR).
- [docs/prds/006.1-phase-6.1-config-helpers-and-test-layout.md](../prds/006.1-phase-6.1-config-helpers-and-test-layout.md) - the phase that surfaced the defect and ships the fix.
