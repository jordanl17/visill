# ADR 0020: Migration branch + `pnpm.overrides link:` strategy

- Status: Accepted
- Date: 2026-05-28

## Context

Three production skill repos (`claude-skill-decision-tree`, `claude-targettable-feedback`, `claude-skill-linear-editing`) need to adopt the visill framework before stable cuts. Each migration lives on a long-lived `visill-migration` branch in its own repo, opened in Phase 8 (DT canary) and Phase 9 (TF + LE parallel), then merged to consumer `main` at Phase 10 alongside the stable `0.1.0` cut ([ADR 0019](./0019-rc-publish-via-changesets-prereleases.md)).

Two facts shape the install recipe and pull in opposite directions:

- Local dev needs SDK changes to propagate instantly. The whole point of running visill and a consumer side by side is to feel the gap, fix it on visill `main`, and see it in the consumer without a publish round-trip.
- CI must prove the published tarball works. If CI resolves the same `link:` paths local dev does, the rc tarballs go untested until Phase 10, which is exactly the failure ADR 0019 exists to prevent.

The two install modes have to coexist on the same branch.

## Decision

Adopt a four-part recipe applied identically across the three consumer repos.

- **One long-lived `visill-migration` branch per consumer**, opened in Phase 8 or 9 and merged to that repo's `main` at Phase 10. The branch tracks the `rc` dist-tag through the migration window.
- **Local dev: `pnpm.overrides`** in the consumer's root `package.json` point each of the three `@visill/*` packages at `link:../visill/packages/<folder>`. SDK edits on visill `main` reach the consumer on the next `pnpm install` with no publish step.
- **CI: a per-repo `.npmrc.ci`** carries CI-specific resolver config (e.g. `prefer-frozen-lockfile=false`). The workflow runs `cp .npmrc.ci .npmrc`, strips the overrides block with `jq 'del(.pnpm)' package.json > package.json.ci && mv package.json.ci package.json`, then `pnpm install --no-frozen-lockfile`. pnpm 10.x exposes no built-in override-disable flag (verified against pnpm.io/settings), so the strip-and-install dance is the supported path.
- **Never patch visill packages from a consumer branch.** New exports, helpers, or build options flow through the API gap protocol ([PRD 007 §7](../prds/007-phase-7-10-release-and-migration.md#7-api-gap-handling-protocol)): file an issue on visill, write a failing test on visill `main`, fix on `main`, cut `rc.N+1` via Changesets, consume from the migration branch.

## Alternatives considered

- **Workspace-style multi-repo monorepo.** Pull the three skill repos into the visill workspace. Rejected: each repo has its own release cadence, history, and CI; merging them surrenders independence for trivial gain over the migration window.
- **`npm link` only, no published RC.** Skip the registry round-trip entirely. Rejected: never proves the published tarball works; risks shipping broken artefacts on the Phase 10 stable cut.
- **Release-train-only, no overrides.** Pin a fixed `rc.N` everywhere and re-cut for every SDK fix. Rejected: the friction kills tight iteration. The `link:` overrides exist precisely so SDK changes propagate without a publish cycle.

## Consequences

- Consumers track a floating `^0.1.0-rc.N` range during migration and inherit each new RC on next `pnpm install`. CI runs prove each rc tarball end-to-end on real consumer code.
- Phase 10 atomic-bumps all three migration branches to `^0.1.0`, deletes the `pnpm.overrides` block, and merges to consumer `main` on the same window ([PRD 007 §5](../prds/007-phase-7-10-release-and-migration.md#5-phase-10---stable-release)).
- Each consumer's CI has two install modes: developer (overrides honoured) and CI (overrides stripped). The `.npmrc.ci` file and the migration-branch README must call this out so a contributor running the build locally is not surprised when CI resolves a different graph.
- Future skill repos onboarding the visill framework follow the same pattern. New repos start from `pnpm create visill@latest <name>`; existing repos cut a `visill-migration` branch and repeat the recipe.

## References

- [PRD 007 §3](../prds/007-phase-7-10-release-and-migration.md#3-phase-8---dt-canary) - Phase 8 DT canary scope, including the override-strip recipe.
- [PRD 007 §7](../prds/007-phase-7-10-release-and-migration.md#7-api-gap-handling-protocol) - API gap handling protocol.
- [ADR 0019](./0019-rc-publish-via-changesets-prereleases.md) - the RC train this strategy consumes.
