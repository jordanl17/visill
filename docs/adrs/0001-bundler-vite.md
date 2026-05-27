# ADR 0001 - Bundler - Vite + vite-plugin-singlefile

- Status: Accepted
- Date: 2026-05-27

## Context

Visill widget skills bundle to a single self-contained HTML file consumed by claude.ai. The bundler must emit ESM, inline every asset, and slot into a four-package pnpm monorepo without dragging in extra toolchain weight. The three existing harvest repos already use Vite, so continuity matters.

## Decision

Use Vite with `vite-plugin-singlefile` to produce the single-file HTML widget artefact, driven by plugins shipped from `@visill/build`.

## Alternatives considered

- **Parcel** - rejected. See [rejected/parcel-bundler.md](../rejected/parcel-bundler.md).
- **Rolldown** - rejected. Pre-1.0, churn risk too high for a framework intended to ship.

## Consequences

- The Vite plugin ecosystem stays available - `vite-plugin-singlefile`, HTML transform plugins, and any future asset handlers slot in cleanly.
- Builds emit one HTML file per widget; no sidecar JS or CSS to ship, host, or version.
- ESM-only output aligns with the widget runtime constraint and the `visill` SDK's module shape.

## References

- [docs/design/visill-overview.md](../design/visill-overview.md)
