# visill rollout roadmap

High-level phase overview. Detailed PRDs live in `docs/prds/`. Rationale lives in `docs/adrs/`. The design doc is `docs/design/visill-overview.md`.

## Progress

- **Phase 0 - Shipped 2026-05-27.** Direct push to `main` on both affected external repos. TF @ `e9894d9`, LE @ `0863044`. See PRD 000.
- **Phase 1 - Shipped 2026-05-27.** Direct push to `main` on the visill repo at `jordanl17/visill` (public). Commit `cb31904`; first CI run green in 17s. See PRD 001.
- **Phase 2 - Shipped 2026-05-27.** Direct push to `main`. Commit `d6987de`; CI green in 18s. The `visill` package now ships the seven SDK exports plus ADR 0009. Unblocks Phase 3 (build tooling) and Phase 6 (scaffolder template imports). See PRD 002.
- **Phase 3 - Shipped 2026-05-27.** Direct push to `main`. Commit `7012a3e`; CI green in 25s. `@visill/build` ships the four-export surface (`finalizeBundle`, `assembleSkill`, `resolveSkillName`, `defineVisillConfig`) plus ADRs 0010 and 0011. 18/18 tests cover the golden-tree diff, the `widget-bundled.html` structural rules, the `sizeLimit` overflow, two-run determinism, and `resolveSkillName` precedence. Unblocks Phase 5 (`@visill/test`) and Phase 6 (`create-visill` template wiring + migration). See PRD 003.
- **Phase 4 - Shipped 2026-05-27.** Direct push to `main`. Three commits: `d69aa98` (code + ADRs), `6f65027` (NPM_TOKEN provisioning recorded), `e9c01a8` (PRD Delivery section). CI green on all three. The `create-visill` template now carries the canonical `render.py` plus vendored chevron 0.13.1 under `_vendor/chevron/` (six files including the upstream MIT LICENSE preserved byte-identical), plus ADRs 0012 (JSON-island encoding) and 0013 (vendored chevron strategy) Accepted. Five PRD §5 behavioural invariants verified via smoke. Unblocks Phase 5 (`@visill/test` render-fixture lift) and Phase 6 (scaffolder template scripts). See PRD 004.
- **Phase 5 - Shipped 2026-05-27.** Direct push to `main`. Four commits: `8e74ae8` (feat + ADRs 0014/0015), `f69b9da` (CLAUDE.md hard rule for extension-less TS imports), `fcf6ee2` (prettier ignore for handcrafted fixtures), `c29d546` (Phase 6 PRD §3 + ADR 0018 amendments). CI green on `fcf6ee2` after one recovery round on the prettier check. `@visill/test` ships the six-export surface (`createBundleTests`, `createRenderTests`, `loadEvals`, `assertion`, `summarize`, `parseDataIslandFromHtml`) plus five types, four broken-bundle fixtures, the render-fixture dir, and ADRs 0014/0015 Accepted. 40 vitest tests cover all five PRD §8 success criteria; describe/it titles match the DT source byte-identically. Unblocks Phase 6 (`create-visill` scaffolder template imports). See PRD 005.
- **Phase 6 - Shipped 2026-05-27 with CI gates red; Phase 6.1 follow-up planned.** Direct push to `main` at commit `25410f8` (feat) + `63c4f19` (CI build-order fix). `create-visill` scaffolder + canonical template + vendored `examples/decision-tree/` + tsup ESM migration for `visill` / `@visill/build` / `@visill/test` + four ADRs (0016 single-prompt UX, 0017 vendored-example integration gate, 0018 lockfile + ignore policy, 0023 tsup ESM emission). 40 scaffolder unit tests + 23 SDK + 18 build + 40 test-preset + 34 vendored-example tests pass locally. Two CI gates remain red on `main`: the vendored example surfaced two Phase 3 / Phase 1 design gaps that the integration gate (working as ADR 0017 promised) caught — `defineVisillConfig({})` is incomplete, and the `visill` package colocates tests with source while siblings separate them. Both gaps fixed in Phase 6.1. See PRD 006.
- **Phase 6.1 - Shipped 2026-05-27 with CI gates red; Phase 6.2 follow-up planned.** Direct push to `main`. Three commits: `3f35ea2` (refactor: tests separated from source per ADR 0024), `5c4d414` (refactor: resolveSkillName reads package.json only per ADR 0025, superseding ADR 0011), `f7ce25d` (feat: defineVisillConfig wires root, input, outDir, and assembly plugins). ADR 0024 (test layout) authored in the Phase 6 follow-up; ADR 0025 (skill-name from package.json only) Accepted. Local quality gate green pre-commit: 159 tests (visill 23, visill-build 22, visill-test 40, create-visill 40, examples/decision-tree 34); prettier and lint clean; `pnpm -r build` clean. CI on `f7ce25d`: `ci` and `scaffolder-windows` green; `scaffolder-smoke` and `vendored-example` red. The reds are not Phase 6.1 regressions - the integration gate (working as ADR 0017 promised) caught two more pre-existing defects (Phase 4 `render.py` schema path, Phase 5 `createBundleTests` empty describe), a Phase 6 CI/build-script misalignment (`vendored-example` expects a zip that `vite build` does not produce), and the scaffolder template still using `tests/`. Phase 6.2 closes all four. See PRD 006.1.
- **Phase 6.2 - Shipped 2026-05-27.** Direct push to `main`. Seven commits: `ff8b3c6` (fix: createBundleTests empty-literals guard), `7a6690b` (fix: widget sendPrompt raw greeting), `d4ff05b` (fix: render.py + tests target assembled assets), `33840f7` (fix: pnpm build produces zip), `783307a` (refactor: template tests/ to test/), `68660d6` (test: snapshot guards render.py output), `46f0f69` (fix: CI render.py executable check uses unzip -Z). All four CI gates green on `46f0f69`: `ci`, `scaffolder-smoke`, `vendored-example`, `scaffolder-windows`. Both previously-red gates (red for four pushes) now green. The PRD's four planned commits became seven because the integration gate exposed two further latent defects during Wave B and a CI assertion bug surfaced on the first post-fix run. Unblocks Phase 7 (RC publish). See PRD 006.2.
- **Phases 7-10 - Proposed.** PRDs drafted, awaiting upstream phases.

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
