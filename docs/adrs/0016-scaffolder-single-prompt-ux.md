# ADR 0016: Scaffolder single-prompt UX

- Status: Accepted
- Date: 2026-05-27

## Context

`npm create visill` is the author-facing front door to the framework. It runs once per skill, on a host with no visill state, against an author who has not yet read any of the docs. Whatever the scaffolder does in those first few seconds sets the tone for the rest of the framework.

Compare with `create-vite` and `create-next-app`. Both walk the author through a multi-step wizard: template flavour, TypeScript on or off, router style, styling solution, linter, formatter. Each prompt exists because the generator covers a wide problem space and reasonable defaults differ per author. visill does not have that surface. The template ships sensible defaults for license, author, description, dev-aid roster, package manager, and every other knob. Each of those is a file the author edits later; none is a directory-creating decision.

Skill name is the exception. It names the generated directory and the package, threads through `<<SKILL_NAME>>` sentinels in the template, and renaming it after the fact means moving directories and editing files. It is the one decision that cannot be deferred without retroactive cleanup.

The hard-rules section of `CLAUDE.md` reinforces the principle: sensible defaults beat questions. Every prompt is a question the template defaults already answer.

## Decision

The scaffolder accepts the skill name as a positional argument: `npm create visill <name>`.

If the positional argument is absent, the scaffolder shows exactly one prompt: `Skill name (kebab-case):`. Validation runs against `/^[a-z][a-z0-9-]{1,38}$/` - lowercase, kebab-case, leading letter, total length 2 to 39. Invalid input re-prompts with the same message.

Every other configuration value is filled by sentinel substitution from defaults at scaffold time:

- `<<SKILL_NAME>>`, `<<SKILL_NAME_PASCAL>>` derive from the validated name.
- `<<AUTHOR>>` reads from `git config user.name` and `user.email`.
- `<<SKILL_DESCRIPTION>>`, `<<SKILL_TITLE>>` carry placeholder copy keyed to the skill name.
- `<<YEAR>>` is the current year.

After substitution the scaffolder greps the output tree for `<<` and exits non-zero on survivors. The author edits the generated files to customise anything else.

## Alternatives considered

- **Multi-prompt wizard (license, author, template flavour, dev-aid roster, package manager).** Rejected. Every prompt is a question the template defaults already answer. The author can edit `package.json` and `.claude/skills/` after scaffold with no penalty; making them choose up front trades thirty seconds of attention for nothing.
- **Fully positional CLI flags (`npm create visill --name hello --license MIT`).** Rejected. `npm`, `pnpm`, `yarn`, and `bun` pass arguments to `create-*` packages inconsistently: some forward everything after `--`, some forward the first positional only, some swallow flags they recognise. One positional plus an interactive fallback is the lowest common denominator that works across all four.
- **Config-file-only (read `visill.config.json` from cwd if present, else prompt).** Rejected. Authors have not created the config file yet at scaffold time. They are scaffolding it. A config-file flow is a chicken-and-egg loop that solves a problem the template defaults already solve.

## Consequences

- Positional invocation skips all interaction. `npm create visill hello` runs to completion without input.
- Scaffolder code surface stays small: one prompt, one validator, no branching wizard, no question-flow state machine.
- Per-author customisation lives in the substituted files, not in prompt answers. The scaffolder template must keep its defaults sensible; ADR 0017 covers the vendored example as the integration gate that polices template quality, and ADR 0018 covers lockfile and ignore policy specifically.
- `process.env.npm_config_user_agent` is the only hook for detecting whether the scaffold was invoked via npm, pnpm, yarn, or bun. It feeds the post-scaffold next-steps echo and nothing else. Template files never branch on package manager.
- Single-prompt UX is a contract authors will come to expect. Adding a second prompt later is a behaviour change worth its own ADR.

## References

- [PRD 006 §5 scaffolder behaviour spec](../prds/006-phase-6-create-visill-and-examples.md#5-scaffolder-behaviour-spec)
- [PRD 006 §3 deliverables](../prds/006-phase-6-create-visill-and-examples.md#3-deliverables)
- [ADR 0017](0017-vendored-example-integration-gate.md) - vendored decision-tree example as the integration gate covering template quality.
- [ADR 0018](0018-template-shipped-lockfile-and-ignore-policy.md) - template-shipped lockfile and ignore policy.
