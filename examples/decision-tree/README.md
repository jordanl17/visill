# decision-tree (Claude skill)

![Claude skill](https://img.shields.io/badge/Claude-skill-c25f3c)
![release](https://img.shields.io/github/v/release/jordanl17/claude-skill-decision-tree?label=release&color=blue)
![downloads](https://img.shields.io/github/downloads/jordanl17/claude-skill-decision-tree/total?label=downloads&color=blue)
![updated](https://img.shields.io/github/release-date/jordanl17/claude-skill-decision-tree?label=updated&color=blue)
![license](https://img.shields.io/github/license/jordanl17/claude-skill-decision-tree?color=blue)

Walk a branching decision by tapping through an interactive tree, then hand the committed path back to Claude to write the artifact - an ADR, an idea brief, an itinerary, whatever the decision was for. Claude generates the full tree in one turn, so each tap reveals the next level instantly.

> [!NOTE]
> The widget renders in claude.ai (web) and Claude Desktop. Claude Code, `claude -p`, and the Anthropic API cannot invoke `visualize:show_widget`, so the skill no-ops there.

## In action

<!-- TODO: add demo GIF at demo/decision-tree.gif (300-500KB, ~800px wide) -->
<p align="center">
  <img src="demo/decision-tree.gif" width="800" alt="Walking a decision tree and committing a leaf to produce an artifact" />
</p>

## Why this exists

<!-- TODO: add comparison image at demo/comparison.png (prose Q&A vs widget walkthrough) -->
<p align="center">
  <img src="demo/comparison.png" width="800" alt="Prose back-and-forth on the left, decision tree widget on the right" />
</p>

Walking a strategic decision through chat means re-reading the same options five times, scrolling to compare branches, and losing your place when Claude reframes the question. _"Wait, which option were we on?"_

The decision-tree skill renders the whole shape at once. You see all top-level directions, drill into one, and back out to compare siblings without re-prompting. On commit, the committed path plus any branches you explored and abandoned go back to Claude as structured input - so the final artifact reflects what you actually chose against, not just what you chose.

## When it activates

The skill checks three conditions before rendering. All three must hold.

**Decision variance.** Each top-level branch must lead to a genuinely different next-question, not the same question with different filters. Claude runs the variance check internally before rendering. If the level-1 questions collapse to "give me N options in that style", the tree is abandoned and Claude responds with a flat list instead.

Fits:

- _"Help me think through authentication for this side project."_
- _"I want to build a weekend side project. Help me figure out what."_
- _"How should we model variants in the document pair store?"_
- _"Plan a weekend trip from London."_

Does not fit:

- _"Help me name this side project."_ - same question with different stylistic filters
- _"Recommend a podcast about software engineering."_ - flat list, no branching
- _"Walk me through architecting a real-time collaborative editor."_ - cascading dependencies need real-time adaptation
- _"I don't know what I want to build."_ - no bounded structure yet, needs elicitation first
- _"I want to talk through this, not click buttons."_ - explicit request for conversation

**Bounded structure.** 3 levels deep, 2-4 branches per level. Anything wider or deeper gets chunked or walked conversationally.

**Sufficient context.** Either the user has primed the conversation, or one clarifying turn can fill the gap. The skill does not render cold.

## Install

1. Download [`decision-tree.zip`](https://github.com/jordanl17/claude-skill-decision-tree/releases/latest/download/decision-tree.zip) from the latest release.
2. Open [claude.ai/customize/skills](https://claude.ai/customize/skills) (or navigate via **Customize → Skills** in the left sidebar).
3. Click the **+** button, then **Create Skill** → **Upload a Skill**.
4. Select the `decision-tree.zip` file you downloaded.

### Build from source

```bash
pnpm install
pnpm build:zip
```

The zip lands at `decision-tree.zip` in the repo root. Upload it the same way.

## Limitations

- **claude.ai and Claude Desktop only.** Claude Code, `claude -p` (headless CLI), and the Anthropic API cannot invoke `visualize:show_widget`, which the skill depends on to render.
- **Tree shape is path-independent.** The full tree is generated upfront in one Claude turn, so annotations dropped mid-walk feed the final artifact but cannot reshape downstream branches.
- **Depth and breadth caps.** 3 levels deep, 4 branches per level. Larger decision spaces have to be chunked or walked conversationally.
- **Variance gate.** Decisions where every L0 branch leads to the same L1 question are filtered out before rendering. Use a flat list response instead.

## License

MIT. See [LICENSE](LICENSE).
