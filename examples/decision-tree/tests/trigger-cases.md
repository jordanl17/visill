# Manual trigger walkthrough

<!--
A list of prompts to type into a fresh Claude Code session in an
unrelated directory to verify the skill activates (or correctly skips)
for each one.

Why this exists: the eval suite (Surface 3) grades the widget OUTPUT but
cannot tell you whether the skill DECISION (to activate or not) is correct
in conversational context. This file is a 5-minute manual sanity check
after editing the SKILL.md description.

For each case below:
1. Open a fresh CC session in a directory that does NOT contain this repo
2. Type the prompt verbatim
3. Observe: did CC read SKILL.md? Did it attempt to render the widget?
   Was that the right call?
-->

## Should fire

### Case 1: Architecture - authentication strategy

Prompt:

> Help me think through how to handle authentication for this side project.

Expected: skill activates, widget renders with 3 L0 branches (roll-your-own JWT / managed auth provider / framework built-in) each leading to a distinct L1 question.

Reason: bounded set of well-known auth strategies with genuinely different follow-up decisions per branch.

### Case 2: Strategy - micro-SaaS ideation

Prompt:

> I want to build a weekend side project. Help me figure out what.

Expected: skill activates, widget renders with L0 branches across slices of friction (personal admin / information overload / work productivity) and distinct L1 sub-questions per branch.

Reason: bounded ideation framed around problem-space slices, each L0 commits to a different domain with its own follow-up.

### Case 3: Architecture - store model for a feature

Prompt:

> How should we model variants in the document pair store?

Expected: skill activates, widget renders with L0 branches (new model / strangler pattern / hybrid split) each with a distinct L1 question.

Reason: structural architecture decision with a small, enumerable set of strategies that branch into different concerns.

### Case 4: Trip planning - weekend trip

Prompt:

> Help me plan a weekend trip from London.

Expected: skill activates, widget renders with L0 branches (coastal / country / European city break) and different L1 questions per branch (distance and vibe vs activity vs flight-time band).

Reason: bounded trip-type categories with materially different next-questions per category.

## Should skip

### Case 5: Naming exercise

Prompt:

> Help me name this side project.

Expected: skill does NOT activate. Claude responds with a flat list of name options across stylistic angles.

Reason: variance check fails - any L0 categories (punchy / descriptive / metaphorical) just become filters on the same "give me 5 options" question.

### Case 6: Flat shopping list

Prompt:

> Recommend me a podcast about software engineering.

Expected: skill does NOT activate. Claude gives a recommendation or short list inline.

Reason: no branching structure, no variance - a flat list is the right shape.

### Case 7: Cascading dependencies needing mid-walk adaptation

Prompt:

> Walk me through architecting a real-time collaborative editor.

Expected: skill does NOT activate. Claude responds conversationally with iterative back-and-forth.

Reason: each commit opens entirely new question spaces, and L1 questions meaningfully depend on annotations the user might drop mid-walk - a pre-baked tree cannot capture this.

### Case 8: Open-ended exploration

Prompt:

> I don't know what I want to build.

Expected: skill does NOT activate. Claude asks one clarifying question about constraints, interests, or available time.

Reason: no bounded structure yet - elicitation has to happen first before any tree could be sketched.

### Case 9: User explicitly wants conversation

Prompt:

> I want to talk through this architecture with you, not click buttons.

Expected: skill does NOT activate. Claude proceeds conversationally.

Reason: the widget is a precision tool, not a default - honour the explicit request.

## Ambiguous boundary

### Case 10: Could go either way - generic architecture question

Prompt:

> How should I structure the backend for my new app?

Expected: skill does NOT activate without more context. Claude should ask one clarifying question (what kind of app, what constraints) before deciding whether a bounded tree makes sense.

Reason: the prompt sounds like an architecture decision but lacks the bounded surface area needed to enumerate distinct L0 branches. Closer to "open-ended exploration" than to Case 1 - the difference is that the auth-strategy prompt names a sub-problem with a known small solution space, while "structure the backend" names a whole problem space.
