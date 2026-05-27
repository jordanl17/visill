# Orchestrator: spawning the eval runs

A fresh Claude Code session uses the `Agent` tool to spawn 34 background subagents (17 scenarios × 2 conditions). Each subagent runs in its own context with full tool access and writes its output to a per-scenario directory.

## Setup once per iteration

```bash
SKILL_NAME=$(node -p "require('./package.json').name.replace(/^claude-skill-/, '')")
N=1  # bump for each new iteration
WORKSPACE="${SKILL_NAME}-workspace/iteration-$N"
mkdir -p "$WORKSPACE"
# Snapshot the current skill so the baseline is reproducible
cp -R "skill/${SKILL_NAME}" "${SKILL_NAME}-workspace/skill-snapshot-iter-$N"
# Pre-create the per-scenario output dirs
for name in fire-auth-strategy fire-micro-saas-ideation fire-store-model fire-weekend-trip fire-database-choice fire-monorepo-structure fire-windfall-allocation fire-runtime-strategy fire-binary-choice skip-naming-exercise skip-flat-recommendation skip-cascading-deps skip-open-ended skip-conversation-request skip-honeymoon-trio skip-style-direction skip-factual-question; do
  mkdir -p "$WORKSPACE/eval-$name/with_skill/run-1/outputs"
  mkdir -p "$WORKSPACE/eval-$name/without_skill/run-1/outputs"
done
```

## Spawn all 34 subagents in one turn

For each scenario in `tests/evals/evals.json`, spawn TWO background subagents in the SAME Agent tool call batch (one with_skill, one without_skill). Use `subagent_type: "general-purpose"` and `run_in_background: true`. System notifications fire automatically as each completes.

### with_skill prompt template

```
You are evaluating the decision-tree Claude skill.

INSTRUCTIONS:
1. Read the skill at {ABSOLUTE_REPO_PATH}/skill/{SKILL_NAME}/SKILL.md. The widget template is at {ABSOLUTE_REPO_PATH}/skill/{SKILL_NAME}/assets/widget-bundled.html - read it if the skill tells you to.
2. Decide objectively whether the skill should activate for the task below, using the activation rules in SKILL.md. Don't activate just because you read the file; only activate if the rules clearly indicate this prompt should trigger.
3. If activating: follow the skill's instructions to produce the final widget HTML. The visualize:show_widget tool is NOT available in your environment - instead of calling it, pipe the JSON payload through `${ABSOLUTE_REPO_PATH}/skill/${SKILL_NAME}/scripts/render.py` via stdin (heredoc), capture stdout, and write it to outputs/widget.html. Also write a brief assistant lead-in message to outputs/response.md.
4. If NOT activating: do the task naturally and write your natural response to outputs/response.md. Do not produce widget HTML.

TASK PROMPT:
{PROMPT_FROM_evals.json}

OUTPUT DIRECTORY (already exists):
{ABSOLUTE_REPO_PATH}/{WORKSPACE}/eval-{SCENARIO_ID}/with_skill/run-1/outputs/

ALSO WRITE meta.json at that directory: {"activated": true|false, "reason": "one sentence why"}

Return a one-line summary.
```

### without_skill (baseline) prompt template

```
You are responding to a user prompt as a normal Claude assistant. Do NOT consult any installed skills - in particular, ignore "decision-tree". Respond naturally as if no specialized skill existed.

TASK PROMPT:
{PROMPT_FROM_evals.json}

Write your full response to: {ABSOLUTE_REPO_PATH}/{WORKSPACE}/eval-{SCENARIO_ID}/without_skill/run-1/outputs/response.md

ALSO WRITE meta.json at that directory: {"activated": false, "reason": "baseline run, skill ignored"}

Return a one-line summary.
```

## After all 34 complete

```bash
SKILL_NAME=$(node -p "require('./package.json').name.replace(/^claude-skill-/, '')")
pnpm eval:grade "${SKILL_NAME}-workspace/iteration-$N"
pnpm eval:preview "${SKILL_NAME}-workspace/iteration-$N"
open "${SKILL_NAME}-workspace/iteration-$N/eval-preview.html"
```

The preview page renders each widget visually with claude.ai design-system fallbacks, shows the grading per assertion, and lets the user leave per-scenario feedback that copies to clipboard as a JSON payload.

## Iteration log

As you accumulate iterations, document baseline scores here so future iterations have something to compare against.

### Iteration 1 baseline (skill v0.2.0)

- Scope: 4 of 9 scenarios run (fire-auth-strategy, fire-micro-saas-ideation, skip-naming-exercise, skip-conversation-request) as a sanity check of the eval flow.
- Findings:
  - The "Sufficient context. Never render cold" rule in SKILL.md is sharp - fire-micro-saas-ideation did NOT activate because the cold prompt offered no priming. Worth deciding whether EXAMPLES.md should reflect that those prompts require additional context, or whether the skill's cold-render guard should soften.
  - fire-auth-strategy DID activate and produced a real 3-2-2 tree.
  - Skip cases (naming, conversation-request) correctly skipped.
