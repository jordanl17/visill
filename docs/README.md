# visill docs

Locked design decisions, phase PRDs, ADR record, and the playbook for executing a phase. Pull a doc into context only when the current task touches what it covers.

## Design

The locked design - 15 decisions, package layout, hard constraints, scope boundaries: [design/visill-overview.md](./design/visill-overview.md).

## Roadmap

High-level phase plan, release timing, per-phase package coverage: [ROADMAP.md](./ROADMAP.md).

## PRDs

Per-phase PRDs in [prds/](./prds/):

- [000 - Phase 0 release.yml backports](./prds/000-phase-0-release-yml-backports.md)
- [001 - Phase 1 monorepo skeleton](./prds/001-phase-1-monorepo-skeleton.md)
- [002 - Phase 2 visill SDK](./prds/002-phase-2-visill-sdk.md)
- [003 - Phase 3 @visill/build](./prds/003-phase-3-visill-build.md)
- [004 - Phase 4 canonical render.py](./prds/004-phase-4-canonical-render-py.md)
- [005 - Phase 5 @visill/test](./prds/005-phase-5-visill-test.md)
- [006 - Phase 6 create-visill and examples](./prds/006-phase-6-create-visill-and-examples.md)
- [007 - Phase 7-10 release and migration](./prds/007-phase-7-10-release-and-migration.md)

## ADRs

Canonical index and numbering authority: [adrs/README.md](./adrs/README.md).

Phase 1 ADRs (lands in a single docs commit):

- [0001 - Bundler - Vite + vite-plugin-singlefile](./adrs/0001-bundler-vite.md)
- [0002 - Monorepo with Changesets, independent semver](./adrs/0002-monorepo-with-changesets.md)
- [0003 - Single full-featured template](./adrs/0003-single-full-featured-template.md)
- [0004 - render.py stdin contract](./adrs/0004-render-py-stdin-contract.md)
- [0005 - Dev-aid skills in .claude/skills/](./adrs/0005-dev-aid-skills-in-dot-claude.md)
- [0006 - Gitignore built skill/ directory](./adrs/0006-gitignore-built-skill-dir.md)
- [0007 - SKILL.md description 1024-char cap](./adrs/0007-description-1024-char-cap.md)
- [0008 - pnpm pin via packageManager field](./adrs/0008-pnpm-pin-package-manager-field.md)

## Rejected options

Options considered and dropped live in [rejected/](./rejected/):

- [parcel-bundler.md](./rejected/parcel-bundler.md)
- [state-primitive.md](./rejected/state-primitive.md)
- [eval-cli.md](./rejected/eval-cli.md)
- [brand-tokens.md](./rejected/brand-tokens.md)
- [schema-to-form.md](./rejected/schema-to-form.md)

## Playbook

How a Claude Code session picks up and executes a single phase: [PHASE-PLAYBOOK.md](./PHASE-PLAYBOOK.md).
