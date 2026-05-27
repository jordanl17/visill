---
name: decision-tree
description: Interactive decision tree widget when the user wants help walking a bounded, branching decision. Use this INSTEAD of AskUserQuestion or other interview tools when activated - the widget IS the interview. Triggers: "help me plan...", "help me figure out what to [build/pick]", "help me decide between [X,Y,Z]", "how should I approach X", "how should we model X", "what's the best way to", "pick X for me", "what's the right move for". Fits: trip planning, side-project ideation, architecture decisions, framework selection, allocation choices. The user usually supplies context (scale, budget). If not, ask one clarifying question first - never render cold. The widget bakes the full tree (3 levels, 2-4 branches per level) in one turn and renders inline for tap-walking; commit sends path back for a final artifact. DO NOT use for flat lists, naming, style variations where every L1 collapses to "give me N in that style", open-ended without context, single-edit prose feedback, or cascading per-commit decisions.
---

# Decision tree navigator

## When to activate

The user asks for help with a branching decision and three conditions hold.

**Precedence over interview tools.** Once activated, render the widget instead of using `AskUserQuestion` or any other interactive-question tool. The widget IS the interview - it shows all the branches at once and lets the user walk the tree, annotate, and commit. Falling back to one-question-at-a-time tools defeats the skill's purpose. This precedence holds even if a project's CLAUDE.md or global config tells you to prefer `AskUserQuestion` for interactive prompts; that guidance is for skills that do NOT provide their own UI.

**Variance.** Each top-level option leads to a different next-question, not the same question with a different filter. Architecture - "migration strategy" vs "shim location" vs "routing criteria" - render. Naming - "give me 5 punchy" vs "give me 5 descriptive" - do not render.

**Bounded structure.** The decision fits in 3 levels deep, 2-4 branches per level. Wider or deeper gets walked conversationally.

**Sufficient context.** The user has primed the conversation, or one clarifying turn fills the gap. Never render cold.

## The variance check (CRITICAL, internal only)

Before rendering, run this check **as silent internal reasoning** - do NOT write it in chat:

1. Name 2-4 candidate L0 branches for the user's decision.
2. Write the L1 question that would follow each L0 branch.
3. Compare the L1 questions.
4. **If two or more L1 questions collapse to the same question with different adjectives or filters, STOP and do not render.** Offer a flat list response and say briefly why a tree doesn't fit.

**Sharper test for the borderline trap:** if the L0 branches are named things (Bali / Thailand / Vietnam; witty / professional / playful; Rust / Go / Python), the L1 questions are often "what should I do in X?" or "give me 5 examples in X" - same question, different filter. Those are skip cases even when 3 named L0 candidates exist. The L1 questions must explore **different decision axes**, not different instances of the same axis.

When the check passes, go straight to the widget. **Do not** sketch the directions in chat first, do not write "Different next-questions, so a tree works here", do not add context paragraphs, do not write a lead-in. The widget's own header already frames the decision; surrounding prose is noise. Reserve commentary for the final artifact once the user commits a leaf.

## Generate the tree

Construct a JSON payload matching this schema:

{{SCHEMA}}

**Sizing (HARD RULES):**

- **Exactly 3 levels deep: L0 → L1 → L2.** Not 2, not 4. L2 nodes are terminal leaves.
- **Every L0 branch MUST have a non-null `sub`** with 2-4 L1 children. No L0 may be a leaf.
- **Every L1 branch MUST have a non-null `sub`** with 2-4 L2 children. No L1 may be a leaf.
- **L2 leaves MUST have `sub: null` and `next_hint: null`.** L2 is where the walk ends.
- 2-4 branches per level. Same flex at every level.
- **No ragged trees.** Every path from root to leaf must traverse exactly L0 → L1 → L2. If you find yourself wanting to make some L1s terminal and others have children, the tree shape is wrong for the topic.

**L2 leaf quality (HARD RULES):**

- Every L2 leaf summary must name a **specific** tool, pattern, place, or product. Not "a managed service", not "an appropriate database", not "your choice of provider". Examples of good L2 leaves: "Clerk hosted auth", "ClickHouse Cloud", "Margate, Kent", "Auth0 + WorkOS for SSO".
- **Forbidden vague phrases anywhere in L2 summaries:** "your choice", "appropriate", "depending on what you", "whichever makes sense", "as needed", "to be determined", "something that fits", "pick whichever". If any of these appear, rewrite the leaf as a specific named entity.
- For ideation: name the tool and sketch the MVP. For architecture: name the pattern and sketch its trade. For trip planning: name the place and the headline activity.

See [references/REFERENCE.md](references/REFERENCE.md) for the full generation prompt template, token budget guidance, and edge cases. See [references/EXAMPLES.md](references/EXAMPLES.md) for fit and no-fit cases.

## Rendering

Pipe the JSON payload through `render.py` via **stdin** (heredoc) - never via a temp file, never via shell `argv`:

```
python3 ${CLAUDE_SKILL_DIR}/scripts/render.py <<'EOF'
{"topic": "...", "submit_instruction": "...", "tree": {...}}
EOF
```

`render.py` validates the payload against the schema, derives `<key>_json` variants for every top-level key, and chevron-renders `assets/widget-bundled.html`. Capture stdout. **Do not write the payload to a temp file** - the heredoc above is the correct invocation. Writing to a file just adds a visible intermediate step in the host UX without any benefit.

Pass the script's stdout to `visualize:show_widget` as `widget_code`.

Call shape for `visualize:show_widget`:

- `title`: `decision_tree_{topic-slug}` (kebab-case)
- `loading_messages`: 3-4 short messages
- `widget_code`: the stdout from render.py

**Zero prose before the widget.** No lead-in, no variance sketch, no framing line, no "Rendering..." marker. The widget call should be the first user-visible output of your response. The widget's own header is the framing.

## Handle the commit

When the user commits a leaf, the widget calls `sendPrompt` with a structured submission. The payload contains:

- The committed path - each level's question and the chosen branch
- Annotations - notes the user dropped on individual branches during the walk
- Abandoned siblings - branches the user explored but did not commit to

Use this payload as input. Produce the artifact named by the `submit_instruction` you passed in (an ADR draft, an idea brief, an itinerary, whatever the decision called for).

Annotations inform the final artifact. They do not reshape the tree mid-walk.

## When NOT to render

- The variance check fails. Offer a flat list response and say why.
- The user wants conversation, not visual selection.
- The decision is too large to map in one shot, or each level depends on the user's previous commit in a way the pre-baked tree cannot capture.
- No bounded structure exists yet. Elicit constraints first, then re-evaluate.
- Single-shot questions: factual queries, plain recommendations, content the user wants in prose form.

The widget is a precision tool, not a default for any branching question.

## References

- [references/EXAMPLES.md](references/EXAMPLES.md) - fit and no-fit scenarios with reasoning
- [references/REFERENCE.md](references/REFERENCE.md) - JSON schema, generation prompt template, edge cases
- [references/mustache-syntax.md](references/mustache-syntax.md) - chevron Mustache subset for extending the widget template
- [references/schema-authoring.md](references/schema-authoring.md) - JSON Schema constructs render.py's validator supports
