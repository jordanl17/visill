# Phase execution playbook

How a Claude Code session executes a single phase of the visill rollout. Each phase is self-contained: a fresh session, given only this playbook and the phase's PRD, can drive the work to completion.

## When to use this doc

- Starting a new Claude Code session to execute a phase (Phase 0 through Phase 10).
- Resuming a paused phase.
- Picking up a phase someone else started.

To design a phase (write a PRD) or decide architecture, read `docs/design/visill-overview.md` and `docs/ROADMAP.md` instead.

## Inputs the session needs

Open these before starting:

1. The phase PRD at `docs/prds/00N-phase-N-<slug>.md`. The source of truth for scope.
2. `docs/ROADMAP.md` for upstream/downstream context.
3. `docs/adrs/README.md` for canonical ADR numbering (PRDs may drift; the index wins).
4. The user's global `CLAUDE.md` (auto-loaded) for non-negotiable rules.
5. For phases lifting from existing skills: the three repos at `../claude-targettable-feedback`, `../claude-skill-decision-tree`, `../claude-skill-linear-editing`.

## Execution shape

Every phase follows the same seven-stage flow. Stages 1-3 take human input; Stages 5-7 run autonomously once started. Stage 4 fans out to parallel sub-agents.

### Stage 1: Confirm scope

Re-read the PRD's Goal, Scope, and Deliverables sections. State back to the user in 3-5 sentences what this phase covers and what it explicitly excludes. Ask before producing tasks if anything is ambiguous.

### Stage 2: Produce a task graph

Spawn a task-breakdown sub-agent (not the main session). Hand it the PRD path and the constraints below. It returns JSON of the shape:

```json
[
  {
    "subject": "imperative, concise",
    "description": "what to do, success criteria, isolation scope",
    "activeForm": "present-continuous for the spinner",
    "parallelizable": true,
    "blockedBy": [],
    "repo_root": "/absolute/path"
  }
]
```

Constraints the breakdown agent must honour:

- One file or one cohesive sub-deliverable per task. Granular enough that two parallel sub-agents cannot collide.
- Name the exact files and (where applicable) line numbers per task.
- Mark tasks `parallelizable: true` only when they touch disjoint files.
- Add explicit "review diff" gate tasks before any task that stages or commits.
- Add PR-open tasks as placeholders with `parallelizable: true` and `blockedBy` pointing at the review task. Mark them "do not execute without explicit user go-ahead."
- Never delegate commit-message drafting to a sub-agent. Per global `CLAUDE.md`: commit messages use exactly the message the user provides.

### Stage 3: Create tasks and present the plan

Loop through the JSON and call `TaskCreate` per task. Then call `TaskList` and present the user with:

- The full task list (subjects only)
- The parallelism map (which tasks run concurrently)
- The critical path length
- Any blocker prompts that need user input before execution

Wait for user confirmation before executing.

### Stage 4: Execute tasks

For each task ready to run (no open `blockedBy`):

1. `TaskUpdate status: in_progress`.
2. Spawn a sub-agent with `subagent_type: general-purpose`. Use `isolation: "worktree"` when the task modifies files in a repo with uncommitted work or when the task is destructive.
3. Hand the sub-agent the full task description plus its `repo_root`. Tell it explicitly: "do not stage, commit, or push - leave changes unstaged and report a diff."
4. Inspect the reported diff when the sub-agent returns. Verify it matches the task's success criteria.
5. `TaskUpdate status: completed`.

Run parallelizable tasks concurrently by emitting multiple `Agent` tool calls in one message.

### Stage 5: Phase wrap-up

This stage runs **autonomously**. The coordinator does not pause for user approval between sub-steps. Only `git push`, `gh pr create`, force-push, reset, and other externally-visible or destructive actions remain gated on the user.

When all edit and review-diff tasks are `completed`:

1. **Quality gate.** Run whichever of `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` apply to the affected repo(s). If a check is not applicable (e.g. Phase 0 only touches workflow YAML and has no pnpm script to run), say so in the wrap-up report and skip it. Any failure aborts the wrap-up - do not commit.

2. **Simplifier pass.** Dispatch the `code-simplifier:code-simplifier` agent against the staged diff (or unstaged working-tree diff if nothing is staged) to tidy and de-duplicate without changing behaviour. Re-run the quality gate after its changes. Note when the simplifier makes no changes and move on. For Phase 0 (workflow YAML only) the simplifier pass is a no-op and may be skipped with a note.

3. **Success criteria check.** Walk the PRD's Success Criteria section item by item and confirm each holds. Any failure aborts the wrap-up - do not commit.

4. **ADR check.** When the phase introduces an ADR, confirm it was written and numbered correctly per `docs/adrs/README.md`.

5. **Local commit.** Stage only the files the phase intentionally changed (never `git add -A` or `git add .`). Commit locally with a Conventional Commits title: short, terse, describing the implication of the change rather than the mechanics. One commit per affected repo unless the PRD says otherwise. The **coordinator** runs this commit, not a sub-agent. **Do not push.**

6. **Phase report.** Five-line summary covering: what shipped, what was deferred, success criteria status, the local commit SHA(s), and what unblocks downstream. Surface any Open Questions unresolved during execution to the next phase's PRD as inputs.

7. **Stop and wait.** After the report, halt. Wait for the user to authorize delivery (direct push to `main` is the default where sensible; PR is the fallback - see Constraints below) or to trigger the next phase.

### Stage 6: Post-push babysit + failure recovery

Runs after the user authorizes delivery (push or PR) for a phase. Also autonomous - the recovery loop needs no further user approval, only the eventual re-push.

1. **Identify the workflows.** For each repo that received a push or PR, list the GitHub Actions workflows that trigger on the event: `gh run list --repo <owner>/<repo> --branch main --limit 5` (direct-push delivery) or `gh run list --repo <owner>/<repo> --branch <feature> --limit 5` (PR delivery). Capture the run IDs matching this push's SHA.

2. **Babysit.** Watch each run to completion via the `Monitor` tool around `gh run watch <run-id> --repo <owner>/<repo>`, or poll with `gh run view <run-id> --repo <owner>/<repo> --json status,conclusion --jq '.status + " / " + (.conclusion // "pending")'` in an until-loop. Do not block the conversation. When runs take more than a few minutes, fire them off in the background and surface a concise status once they settle.

3. **On success.** Report the runs as green. Surface the conclusion and commit URL for each repo. Phase delivery is complete.

4. **On failure.** Trigger the recovery loop:
   1. **Plan.** Spawn a sub-agent with `subagent_type: Plan` (the planning agent) and hand it: the failing run's logs (`gh run view <run-id> --log-failed --repo <owner>/<repo>`), the SHA pushed, the affected files, and the PRD context. Ask it to interrogate the failure and produce a concrete remediation plan: root cause, files to touch, suggested fix shape, risk notes.
   2. **Decompose.** Convert the remediation plan into new tasks via `TaskCreate`. One file per task where reasonable, paired with review-diff gates, exactly like the original phase task graph. Append the new tasks to the existing task list; do not delete the completed Phase tasks.
   3. **Execute.** Dispatch the new tasks via fan-out per Stage 4. The coordinator still owns all git writes.
   4. **Re-wrap-up.** Run Stage 5 again on the fix: quality gate, simplifier pass, success criteria check (against both the original PRD and the failure's root cause), local commit (Conventional Commits title reflecting the fix, not the original work), then surface for user re-authorization to push.
   5. **Re-push and re-babysit.** On user go-ahead, push the fix and re-enter Stage 6 step 1. Loop until green or until the user calls it.

5. **Escalation.** Stop and ask the user when the recovery loop iterates twice without going green. Two failed fix attempts signals that the diagnosis is wrong, not that the next attempt will land.

### Stage 7: Phase handoff

Runs once Stage 6 reports green and the phase is complete. The goal is to leave a clean baton for whoever picks up the next phase, whether that is a fresh session or a different teammate.

1. **Compose the phase summary.** Tight 5-8 line summary: what shipped, what was deferred, the commit SHA(s) per affected repo, what unblocks downstream phases, any open questions to carry forward. Pull from the Stage 5 phase report; expand only on items that need next-session context.

2. **Run `/handoff`.** Invoke the `handoff` skill to compact the current conversation into a handoff document. The skill writes to a `/tmp/handoff-<topic>-<date>.md` file by default; capture the absolute path it returns. This file is the source of truth for the next session.

3. **Update durable artefacts.** Update `docs/ROADMAP.md` Progress section to mark the phase shipped (date, commit SHAs, delivery mode). Update the phase PRD's Status to `Shipped` and append a Delivery section plus Lessons-learned section that capture anything surprising. These survive in git; `/tmp/handoff-*.md` does not.

4. **Update memory.** Save a project memory recording the phase outcome (use the same naming pattern as `project_phase_0_shipped.md`). Save a feedback memory for any process learning that should not repeat. Update `MEMORY.md` to index the new entries.

5. **Final message.** Write a closing assistant message that:
   - Names the absolute path to the `/tmp/handoff-*.md` file produced by step 2.
   - Summarises the phase outcome in 3-5 bullets covering delivery commit, CI status, downstream unblocks, and any unresolved items.
   - Names the next phase by number and PRD path (e.g. "Next: Phase 2 - `docs/prds/002-phase-2-visill-sdk.md`").
   - Tells the next agent to read the handoff file first, then the next phase's PRD, then re-enter this playbook at Stage 1 for that phase.

6. **Stop.** The session ends here. Do not start the next phase in the same session unless the user explicitly asks; a fresh session preserves the handoff boundary.

## Constraints that apply to every phase

These come from global `CLAUDE.md` and from locked design decisions. Sub-agents must respect them.

- **Local commits are autonomous; push and PR open are not.** The coordinator stages and commits at the end of Stage 5 without prompting. Never `git push`, force-push, reset, or open a PR without the user explicitly asking. Sub-agents never stage or commit - only the coordinator does, and only at Stage 5 step 5.
- **Direct push to `main` is the default delivery mode where sensible.** On user authorization, the coordinator pushes the wrap-up commit straight to `origin/main` on any repo where: `main` is not branch-protected (check via `gh api repos/<owner>/<repo>/branches/main/protection`), the change has passed the Stage 5 quality gate locally, and a PR's review-gate adds no value (mechanical CI hygiene, single-maintainer repo, etc.). Fall back to a feature branch and PR when any condition fails. If `origin/main` has diverged at push time (e.g. release-please bot landed a release commit), the coordinator rebases the local commit onto `origin/main` and fast-forward-pushes. This is non-destructive and needs no fresh authorization round.
- **Sub-agents do not perform git writes.** All `git add`, `git commit`, `git checkout`, `git merge`, `git rebase`, `git push`, branch create/delete, and `gh` calls run from the coordinator's Bash. Sub-agent harnesses often refuse git-write operations as policy violations even when the prompt authorizes them, and you will lose a turn diagnosing it. Delegate file edits, reads, builds, tests, and lints to sub-agents. Keep git in the coordinator.
- **pnpm only.** Never use npm or yarn directly in any task.
- **Default branch is `main`.**
- **Wrap-up commit messages are Conventional Commits titles**, short and terse, describing the implication of the change. Sub-agents do not draft them. The coordinator drafts them at Stage 5 step 5.
- **All prose runs through `/writing-clearly-and-concisely` before finalising.** This covers PRDs, ADRs, READMEs, commit messages, PR bodies, phase reports, error messages, and non-trivial code comments. The skill enforces Strunk's terseness rules. Skip it only for shell output, raw logs, code-only edits, and trivial typo fixes.
- **No em dashes in prose.** Hyphens only.
- **No negated boolean expressions, no IIFEs, no single-character variable names.**
- **Functional declarations over for-loops** where reasonable.
- **Code comments**: never explain WHAT; explain WHY only when non-obvious.

## Sub-agent isolation patterns

Three isolation models exist. Pick per task:

| Pattern | When | How |
|---|---|---|
| Read-only inspection | Verifying a diff, running tests, gathering info | `Agent` with no `isolation` flag |
| Same-repo edits, non-destructive | Touching files in a single repo where no other agent is working | `Agent` with no `isolation` flag, `repo_root` in description |
| Risky or destructive | Bulk renames, deletions, anything that could clobber uncommitted work | `Agent` with `isolation: "worktree"` |

For Phase 8-9 migration work, `isolation: "worktree"` is mandatory because the migration touches three external repos with shipping `main` branches.

## What success looks like, per phase

Each phase PRD encodes its own success criteria. The phase is complete when:

- All `TaskList` tasks for the phase are `completed`.
- The PRD's Success criteria all hold (verified explicitly in Stage 5).
- The ADR(s) for the phase exist on disk per the index in `docs/adrs/README.md`.
- CI for the visill monorepo is green on the branch where the phase work landed.
- Any open questions the phase surfaced are written into the next phase's PRD as inputs, not left as floating notes.

## Pitfalls observed in prior sessions

- **Re-deriving locked decisions.** If `docs/design/visill-overview.md` decided it, skip the rerun. Push back to the design doc to amend.
- **Conflating PRD drift with reality.** The ADR index in `docs/adrs/README.md` is the canonical numbering. PRDs may reference superseded numbers; the index wins.
- **Letting sub-agents stage.** They will try unless told otherwise. Repeat the rule in the task description.
- **Skipping the review gate.** Every edit task pairs with a diff-review task. Skipping it breaks the human-in-the-loop guarantee.
- **Running evals in CI.** Per ADR 0022, evals run locally only. The scaffolded template `build.yml` excludes `tests/evals/` from CI test runs.

## Quickstart for a new session

```
1. Read /tmp/handoff-*.md if a prior session left one (look for the latest visill handoff)
2. Read docs/prds/00N-phase-N-<slug>.md
3. Read docs/PHASE-PLAYBOOK.md (this file)
4. Skim docs/adrs/README.md
5. Skim global CLAUDE.md (auto-loaded)
6. Ask user: "Confirm scope for Phase N? Or any deviations?"
7. Spawn breakdown sub-agent
8. TaskCreate from breakdown
9. TaskList + present plan to user
10. Execute (parallelize where safe, gate on diffs, never stage)
11. Verify success criteria + Stage 5 local commit
12. Push on user authorisation; Stage 6 babysits CI
13. Stage 7: run /handoff, update ROADMAP + PRD, write final message naming the next phase
```
