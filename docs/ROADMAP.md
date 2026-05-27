# visill rollout roadmap

High-level phase overview. Detailed PRDs live in `docs/prds/`. Rationale lives in `docs/adrs/`. The design doc is `docs/design/visill-overview.md`.

## Progress

- **Phase 0 - Shipped 2026-05-27.** Direct push to `main` on both affected external repos. TF @ `e9894d9`, LE @ `0863044`. See PRD 000.
- **Phase 1 - Shipped 2026-05-27.** Direct push to `main` on the visill repo at `jordanl17/visill` (public). Commit `cb31904`; first CI run green in 17s. See PRD 001.
- **Phases 2-10 - Proposed.** PRDs drafted, awaiting upstream phases.

## Repo

The visill monorepo lives at `github.com:jordanl17/visill` (public). The default branch is `main`; `origin` is configured. Phase 1 set this up; later phases push direct to `main` per the playbook unless a phase declares otherwise.

## At a glance

| Phase | Focus | Packages touched | npm release? | CLAUDE.md? |
|---|---|---|---|---|
| 0 | Backport pnpm/action-setup workflow fix in existing skill repos | _(none in visill)_ - 2 PRs: `claude-targettable-feedback` (both `build.yml` + `release.yml`) and `claude-skill-linear-editing` (`build.yml` only). `claude-skill-decision-tree` already clean. | no | no |
| 1 | Monorepo skeleton + CI + ADR backfill | All 4 placeholders: `visill`, `create-visill`, `@visill/build`, `@visill/test` | no | **yes - root `CLAUDE.md` lands in this phase** |
| 2 | SDK build-out | `visill` only | no | no (root only) |
| 3 | Vite plugins | `@visill/build` only | no | no |
| 4 | Canonical `render.py` + vendored chevron | _(template asset)_ - lives under `packages/create-visill/template/skill-src/scripts/` | no | no |
| 5 | Test helpers | `@visill/test` only | no | no |
| 6 | Scaffolder + canonical template + vendored example | `create-visill` + `examples/decision-tree/` | no | no |
| 7 | **First npm release: RC tarballs** | All 4 packages publish as `0.1.0-rc.0` on `next` tag | **yes - RC release** | no |
| 8 | Migration canary: `claude-skill-decision-tree` onto visill | _(consumes published RC; iterate RC.N as gaps surface)_ | iterative `0.1.0-rc.N` bumps as needed | no |
| 9 | Parallel migrations: `claude-targettable-feedback` + `claude-skill-linear-editing` | _(consume stabilised RC)_ | possibly one more `rc.N` if a gap surfaces | no |
| 10 | **Stable release: `v0.1.0`** | All 4 packages publish on `latest` tag | **yes - stable v0.1.0** | no |

## Salient points

**When does `CLAUDE.md` get created?** In Phase 1, alongside the monorepo skeleton. A single root-level file points at `docs/` and inlines nothing (per the design doc). v0.1 has no nested per-package `CLAUDE.md` files.

**When do we release to npm?**

- **First publish: Phase 7** as `0.1.0-rc.0` under the `next` tag. All 4 packages publish together. Stable consumers see no change because nothing is on `latest` yet.
- **Iterative RC bumps: Phases 8-9.** Each API gap found during migration produces an `0.1.0-rc.N+1`. Migration branches consume the published RC, not the workspace.
- **Stable release: Phase 10** as `0.1.0` on the `latest` tag. The three migration PRs merge in the same week, or staggered if reviewer fatigue sets in.

**Which packages in which phases?**

- Phase 1 stands up **all 4** packages as empty placeholders (skeleton plus an empty `src/index.ts` barrel) so CI passes from day one.
- Phases 2-6 fill them out **leaf-first** in dependency order: SDK, Vite plugins, render.py, test helpers, scaffolder.
- The vendored `examples/decision-tree/` lands in Phase 6 as a workspace package that consumes all four via `workspace:*`. It is the integration gate.

**What's not a package but still needs Phase tracking?**

- `render.py` plus vendored chevron (Phase 4) is a *template asset*, not a published package. It ships inside the `create-visill` tarball.
- `examples/decision-tree/` stays in-repo and never publishes.
- ADRs land throughout: meta ADRs (0001-0008) backfill in Phase 1; code-touching ADRs (0009+) land with their implementation commit in Phases 2-6 and 8.

**Reading order for someone joining the project:**

1. `docs/design/visill-overview.md` - the locked design
2. `docs/ROADMAP.md` - this file
3. `docs/prds/000-...` through `007-...` - per-phase contracts
4. `docs/adrs/` - decision rationale, pulled as needed
