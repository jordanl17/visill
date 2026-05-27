# ADR 0007 - SKILL.md description 1024-char cap

- Status: Accepted
- Date: 2026-05-27

## Context

Claude skills carry a `description` field in their SKILL.md frontmatter. The widget runtime enforces a 1024-character upper bound. Exceeding it silently truncates the description, which hurts skill discoverability and surfaces only after publish.

## Decision

`@visill/build` validates the description length at build time and fails the build with a clear error when it exceeds 1024 characters.

## Alternatives considered

- **No validation; trust authors** - rejected. Truncation is silent; bugs surface only after publish.
- **Runtime-only validation** - rejected. Pushes failure to consumers instead of catching it at author time.
- **Warn but allow** - rejected. Warnings get ignored in CI logs.

## Consequences

- Authors get a clear build-time error with the actual length and the cap.
- The same validator runs in the scaffolder for parity across author entry points.
- Adjusting the cap requires editing one constant.

## References

- [docs/design/visill-overview.md](../design/visill-overview.md)
