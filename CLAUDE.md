# visill

A framework for building visual Claude skills (the `visualize:show_widget` flavour that renders in claude.ai web and Claude Desktop). Four npm packages:

- `visill` - widget-side SDK runtime (DOM helpers + event delegation, ESM-only, zero deps).
- `create-visill` - `npm create visill` scaffolder.
- `@visill/build` - Vite plugins (`finalizeBundle`, `assembleSkill`, `defineVisillConfig`, `resolveSkillName`).
- `@visill/test` - Vitest preset + eval helpers.

Out of scope: Claude Code skills, the Anthropic API, any non-widget render target.

## Status

Pre-code. Design locked. The repo currently holds only documentation; no packages scaffolded yet. Work runs in numbered phases (0-10) tracked in `docs/ROADMAP.md`.

## Where things live

- `docs/design/visill-overview.md` - locked design (15 decisions, package layout, hard constraints, scope boundaries).
- `docs/ROADMAP.md` - high-level phase plan + npm release timing + per-phase package coverage.
- `docs/prds/00N-phase-N-*.md` - per-phase PRD with goal, deliverables, success criteria, lift map, commit boundaries.
- `docs/adrs/README.md` - canonical ADR index and numbering authority.
- `docs/adrs/00NN-*.md` - individual ADRs as authored.
- `docs/rejected/` - options explicitly considered and dropped.
- `docs/PHASE-PLAYBOOK.md` - how a Claude Code session picks up and executes a single phase.

Pull docs into context only when the current task touches the decisions they cover. Do not load the entire `docs/` tree by default. If a PRD cites an ADR number that conflicts with the index in `docs/adrs/README.md`, the index wins.

## How we work through phases and tasks

The full flow is in `docs/PHASE-PLAYBOOK.md`. The short version:

1. Read the phase PRD at `docs/prds/00N-...md` to confirm scope.
2. Spawn a task-breakdown sub-agent that returns a JSON task graph (one task per file or cohesive deliverable, marked `parallelizable` where safe, gated by explicit diff-review tasks).
3. Loop the JSON through `TaskCreate`. Present the plan to the user with parallelism map and critical path. Do not wait for approval between stages - progress autonomously from picking up the phase through to a local commit. Only `git push`, `gh pr create`, force-push, reset, and other externally-visible or destructive actions require explicit user approval (see Hard rules).
4. Execute in waves via fan-out. A wave is the set of tasks whose `blockedBy` is empty right now. Dispatch the whole wave by emitting one `Agent` tool call per task in a single message so they run concurrently. The main session coordinates and does no task work itself when a sub-agent can handle it. For destructive or external-repo work, use `isolation: "worktree"`.
5. After each wave, gather the sub-agents' reported diffs, run the paired review-diff task, then dispatch the next wave. Sub-agents never stage, commit, push, or open a PR - only the coordinator does, at the wrap-up step.
6. After all edit/review waves, run the **end-of-phase wrap-up** (see below).

Task-graph conventions:
- One file per task where reasonable (so two parallel sub-agents cannot collide).
- Edit tasks always pair with a follow-up review-diff task.
- PR-open tasks are placeholders with explicit "do not execute without user go-ahead" notes.

Fan-out conventions:
- Each sub-agent gets: the task subject + description, its `repo_root`, the hard rules (no staging, no commits, leave changes unstaged, report a diff), and the slice of the PRD's success criteria that touch its files.
- The coordinator marks each task `in_progress` before dispatch and `completed` only after checking the returned diff against success criteria.
- If a wave contains a single ready task, still dispatch it via a sub-agent rather than running in-thread - this keeps the coordinator's context clean.
- **Sub-agents do not perform git writes.** All `git add`, `git commit`, `git checkout`, `git merge`, `git rebase`, `git push`, branch create/delete, and `gh` calls run from the coordinator's Bash. Sub-agent harnesses refuse git-write operations as policy violations even when the prompt authorizes them, which wastes a turn and leaves work half-done. File edits, reads, builds, tests, and lints are fine to delegate. Git is coordinator-only.

## End-of-phase wrap-up

Once all edit and review-diff tasks are `completed`, the coordinator runs this sequence autonomously, without prompting the user between steps:

1. **Quality gate.** Run the quality checks that apply to the affected repo(s): typecheck, lint, tests, build. Use the package's standard pnpm scripts (e.g. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`). If a check does not apply (e.g. Phase 0 only touches workflow YAML), say so in the wrap-up report and skip it.
2. **Simplifier pass.** Dispatch the `code-simplifier:code-simplifier` agent against the diff to tidy and de-duplicate. Re-run the quality gate after its changes.
3. **Success criteria check.** Walk the PRD's Success Criteria section and confirm each one holds. Any failure aborts the wrap-up; do not commit.
4. **Local commit.** Stage only the files the phase intentionally changed (never `git add -A`). Commit locally with a Conventional Commits title: short, terse, describing the implication of the change (not the mechanics). One commit per affected repo unless the PRD says otherwise. The coordinator runs the commit, not a sub-agent.
5. **Phase report.** Five-line summary: what shipped, what was deferred, success criteria status, the local commit SHA(s), and what unblocks downstream. Then stop and wait for the user to authorize push, or to trigger the next phase.

The wrap-up itself is autonomous. Push and PR open still require user authorization, but the default delivery mode for visill phases is **direct push to `main` where sensible**: if `main` lacks branch protection and the change is verified end-to-end, the coordinator pushes straight to `main` on user go-ahead - no PR branch, no review wait. Fall back to a feature branch + PR only when `main` is protected, when CI must gate, or when the change warrants review.

## Post-push: babysit and recover

After the user authorizes delivery, the coordinator enters Stage 6 of `docs/PHASE-PLAYBOOK.md`: it babysits the GitHub Actions runs triggered by the push, watching them to completion via `gh run watch` / `gh run view`. On green, the phase is done. On failure, the coordinator runs a recovery loop autonomously:

1. Spawn a `Plan` sub-agent with the failing run's logs and the PRD context to diagnose the root cause and design a fix.
2. Decompose the fix plan into new `TaskCreate` entries with paired review-diff gates.
3. Dispatch the new tasks via fan-out (sub-agents for file work, coordinator for git).
4. Re-run Stage 5 (quality gate + simplifier + success-criteria check + local commit) on the fix.
5. Ask the user to authorize the re-push, then re-enter Stage 6.

Escalation: two failed fix attempts in a row stop the loop and surface to the user.

## Writing style

When producing prose a human will read - markdown docs, PRDs, ADRs, READMEs, commit messages, PR descriptions, error messages, code comments, phase reports - invoke the `/writing-clearly-and-concisely` skill before finalising. The skill applies Strunk's rules for clear, terse, strong writing. Apply it:

- Before writing a new doc or section of any size.
- Before drafting a commit message at Stage 5 step 5.
- Before posting any phase wrap-up report.
- Before adding a non-trivial code comment that explains a WHY.
- When editing an existing doc and the section touched goes beyond a single-line tweak.

Skip it for: tool-call shell output, raw `git log` excerpts, code-only edits with no prose, and trivial typo fixes. Apply it where it changes the quality of the output, not as ceremony.

## Hard rules

- **Never push, force-push, reset, or open a PR without explicit user permission.** Local staging and committing during the end-of-phase wrap-up run autonomously; everything past the local commit does not.
- Sub-agents never stage or commit. Only the coordinator commits, and only at wrap-up step 4.
- pnpm only.
- Default branch is `main`.
- Autonomous wrap-up commits in this repo use a Conventional Commits title, short and terse, describing the implication of the change. (This overrides the global "use the exact user-provided message" rule for visill phase wrap-up commits only. Sub-agents still draft no commit messages - only the coordinator does, at wrap-up step 4.)
- Hyphens only in prose; no em dashes.
- No negated boolean expressions, no IIFEs, no single-character variable names.
- Functional declarations and higher-order functions over for-loops where reasonable.
- Code comments: never explain WHAT (well-named identifiers do that). Only explain WHY when non-obvious. No temporal or change-related comments.
- Evals run locally only, never in CI (see `docs/adrs/0022-evals-local-only.md`).

## Lookups

- Existing skill repos that visill harvests from and will migrate onto v0.1: `../claude-targettable-feedback`, `../claude-skill-decision-tree`, `../claude-skill-linear-editing`. Treat these as read-only references unless explicitly migrating them.
- Original handoff at `/tmp/handoff-visill-framework-2026-05-27.md` - context for how the project started; superseded by `docs/` once `docs/` exists.
