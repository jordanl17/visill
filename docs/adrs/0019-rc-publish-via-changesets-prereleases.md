# ADR 0019: RC publish via Changesets prereleases

- Status: Accepted
- Date: 2026-05-27

## Context

Phase 6 left visill publish-ready: four packages (`@visill/sdk`, `create-visill`, `@visill/build`, `@visill/test`) at `0.0.0` in a workspace driven by Changesets ([ADR 0002](./0002-monorepo-with-changesets.md)). The integration gate ([ADR 0017](./0017-vendored-example-integration-gate.md)) proves the four cooperate end-to-end against one vendored skill.

Three real consumer repos (`claude-targettable-feedback`, `claude-skill-decision-tree`, `claude-skill-linear-editing`) still need to migrate. Migration will surface SDK gaps the vendored example cannot. Cutting stable `0.1.0` straight to `latest` before that shakedown risks burning the first published version on a surface that turns out to be wrong.

ADR 0002 reserved `latest` for stable. The prerelease dist-tag is chosen here.

## Decision

Enter Changesets prerelease mode for an RC train.

- `pnpm changeset pre enter rc` on visill `main`. Changesets couples the npm dist-tag to the prerelease tag in `.changeset/pre.json`, so the tag string flows through to npm.
- `changesets/action@v1` publishes all four packages at `0.1.0-rc.0` under the `rc` dist-tag on push to `main`. Consumers fetch the latest RC with `pnpm view @visill/sdk@rc version` and install with `pnpm install @visill/sdk@rc`.
- Each API gap discovered during Phase 8-9 migration lands as a fix on `main` and ships as `0.1.0-rc.N+1` via the same workflow. Consumers track by tag, not by pinned version.
- Phase 10 runs `pnpm changeset pre exit` and cuts stable `0.1.0` on `latest`.

## Alternatives considered

- **release-please.** Rejected. Re-litigates ADR 0002 and assumes Conventional Commits throughout the repo, which the rest of visill is not built around.
- **Manual `pnpm changeset publish` from a maintainer's machine.** Rejected. No PR-review surface for the version bump, no audit trail, and no CI gate on `NPM_TOKEN`.
- **Skip prerelease, cut `0.1.0` to `latest` directly.** Rejected. The whole point of Phase 7 is to shake out API gaps against real consumers before stable. Publishing `0.1.0` without that pass squanders the first stable version on an unverified surface.

## Consequences

- `rc.N` sprawl across Phase 8-9 is expected and accepted ([PRD 007 §9](../prds/007-phase-7-10-release-and-migration.md#9-risks--mitigations)). The `rc` tag always points at the newest RC; migration branches consume by tag.
- `latest` stays empty until Phase 10, so no consumer picks visill up by accident before stable is ready.
- The API gap protocol ([PRD 007 §7](../prds/007-phase-7-10-release-and-migration.md#7-api-gap-handling-protocol)) gates every SDK change through visill `main`. No consumer branch patches a visill package directly.
- The integration gate from ADR 0017 stays in CI for early signal; it catches drift before an RC is even cut.

## References

- [ADR 0002](./0002-monorepo-with-changesets.md) - monorepo with Changesets, independent semver.
- [ADR 0017](./0017-vendored-example-integration-gate.md) - vendored example as integration gate.
- [PRD 007 §2](../prds/007-phase-7-10-release-and-migration.md#2-phase-7---rc-release) - Phase 7 scope and token gate.
- [PRD 007 §7](../prds/007-phase-7-10-release-and-migration.md#7-api-gap-handling-protocol) - API gap handling protocol.
