# ADR 0004 - render.py stdin contract

- Status: Accepted
- Date: 2026-05-27

## Context

A visill widget skill ships a `render.py` entry script that claude.ai invokes with a JSON payload describing the widget to render. The transport between host and script has three plausible shapes: stdin, argv, or a temp file on disk. Each shape pins a different failure surface onto every skill, so the framework picks one.

## Decision

`render.py` accepts its JSON payload via stdin only. Never argv. Never a temp file.

## Alternatives considered

- **argv-encoded JSON** - rejected. OS argv length limits, shell-quoting bugs, and payloads containing quotes or newlines break in transit.
- **Temp file** - rejected. Cleanup, race conditions, and sandbox path assumptions all add failure surface the framework would have to hide.

## Consequences

- No quoting bugs at the OS boundary; bytes in equal bytes out.
- Payload size is limited only by available memory, not by argv or filesystem quotas.
- `render.py` reads stdin once at startup and never blocks again.

## References

- [docs/design/visill-overview.md](../design/visill-overview.md)
