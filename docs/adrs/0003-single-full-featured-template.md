# ADR 0003 - Single full-featured template

- Status: Accepted
- Date: 2026-05-27

## Context

The `create-visill` scaffolder emits the starter project a new skill author builds on. That starter could ship as tiers (minimal, standard, full) or as one canonical full-featured flavour. Tiers spread maintenance across variants and force users to pick before they understand the framework.

## Decision

`create-visill` ships one canonical full-featured template. It wires in the SDK, build plugins, test preset, and a demo widget so a freshly scaffolded skill builds and runs end-to-end on first invocation.

## Alternatives considered

- **Tiered templates (minimal/standard/full)** - rejected. Multiplies maintenance load; users picking minimal hit upgrade cliffs.
- **Flavour selection at scaffold time** - rejected. Increases prompt surface and decision fatigue for first-time users.

## Consequences

- One template path to maintain, test, and version.
- Scaffolded skills run end-to-end immediately, with no extra wiring.
- Users delete what they do not need - cheaper than tracking divergent templates.

## References

- [docs/design/visill-overview.md](../design/visill-overview.md)
