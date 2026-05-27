# Decision tree navigator examples

The skill lives or dies on whether the decision has real variance across paths. These examples illustrate where it fits and where it does not.

## Fits

### Architecture: authentication strategy

User: "Help me think through how to handle authentication for this side project."

L0 branches and their L1 questions:

- Roll your own JWT → next decides session storage strategy
- Managed auth provider → next decides which provider features matter
- Framework built-in (NextAuth) → next decides which OAuth providers to plug in

Different next-questions per L0. Variance check passes. Render.

### Strategy: micro-SaaS ideation

User: "I want to build a weekend side project. Help me figure out what."

L0 branches (slice of friction): Personal admin / Information overload / Work productivity drag

- L1 under "Personal admin" asks about which admin slice (money vs calendar)
- L1 under "Information overload" asks about which pile (read-later vs notes)
- L1 under "Work productivity" asks about which friction (context-switching vs meetings)

Each L0 commits to a different problem space. L1 questions are entirely different. Render.

### Architecture: store model for a feature

User: "How should we model variants in the document pair store?"

L0 branches:

- New model → migration strategy
- Strangler pattern → shim location
- Hybrid split → routing criteria

Three completely different L1 questions. Render.

### Trip planning: weekend trip

User: "Help me plan a weekend trip from London."

L0 branches:

- Coastal / Country / European city break

- L1 under Coastal asks about distance and vibe (surfy Cornwall vs tidy Brighton)
- L1 under Country asks about activity (walking vs gastronomy)
- L1 under European city break asks about flight time band (under 2h vs 2-4h)

Different next-questions. Render.

## Does not fit

### Naming exercise

User: "Help me name this side project."

If you tried L0 categories like "punchy / descriptive / metaphorical":

- Punchy → give me 5 punchy options
- Descriptive → give me 5 descriptive options
- Metaphorical → give me 5 metaphorical options

Same question with different filters. Variance check fails. Respond with a flat list across stylistic angles instead.

### Flat shopping list

User: "Recommend me a podcast about software engineering."

No branching, no variance. Just give a recommendation or a short list.

### Cascading dependencies that need real-time adaptation

User: "Walk me through architecting a real-time collaborative editor."

Each commit opens entirely new question spaces, and the L1 question would meaningfully depend on annotations the user might drop mid-walk. The pre-baked tree cannot capture this. Respond conversationally with iterative back-and-forth instead.

### Open-ended exploration

User: "I don't know what I want to build."

No bounded structure yet. Need elicitation first. Don't render. Ask one clarifying turn about constraints, interests, or available time, then re-evaluate.

### User explicitly wants conversation

User: "I want to talk through this architecture with you, not click buttons."

Honour the request. The widget is a precision tool, not a default for any branching question.

## Edge case: the user thinks it fits but it doesn't

The variance check exists precisely for this. Run it internally before rendering: write out the L1 question that would follow each L0 branch. If you find yourself writing the same L1 question for multiple L0 branches with only different adjectives, the check has failed. Pivot to a flat list and explain why briefly. Do not render the widget against the gate.
