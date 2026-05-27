# ADR 0010 - finalizeBundle HTML rewrites

- Status: Accepted
- Date: 2026-05-27

## Context

`vite-plugin-singlefile` inlines every asset into a single `widget.html`, but the emitted markup carries `crossorigin` and `rel="stylesheet"` attributes that mean nothing once the content is inline. The same pass leaves blank lines scattered through the document. The visill skill ships a single self-contained file; it needs that file free of dead attributes and whitespace noise.

The three source widget repos all carry the same post-processing block in `vite.config.ts` (see `claude-skill-decision-tree/vite.config.ts` lines 18-53). Phase 3 lifts that block into `@visill/build` as the `finalizeBundle` plugin. This ADR locks the transforms, the file rename, and the one attribute that must stay.

## Decision

`finalizeBundle()` registers a Vite plugin with `enforce: 'post'` and a `writeBundle` hook. The hook reads the inlined `widget.html`, applies three transforms in order via `Array.reduce`, writes the result to `widget-bundled.html`, deletes the original, and logs the byte length through `this.info`.

The three transforms:

1. Strip `rel="stylesheet" crossorigin` from inlined `<style>` tags. Regex: `/<style\s+rel="stylesheet"\s+crossorigin>/g` → `<style>`.
2. Strip `crossorigin` from inlined `<script type="module">` tags. Regex: `/<script\s+type="module"\s+crossorigin>/g` → `<script type="module">`.
3. Collapse blank lines: split on `\n`, trim each line, drop empty lines, rejoin with `\n`.

Two leftover attributes are safe to drop because they are no-ops on inlined tags:

- `rel="stylesheet"` is a `<link>` attribute. An inline `<style>` block already declares "this is a stylesheet" by tag.
- `crossorigin` controls CORS on resource fetches. An inlined `<style>` or `<script>` fetches nothing.

`type="module"` stays. It defers script execution until the DOM is parsed, so module-top DOM lookups (notably `requireElement`) find their targets even when Vite hoists the `<script>` to the top of the document. Stripping it would break every widget that touches the DOM at module evaluation time.

The plugin accepts an optional `sizeLimit` parameter. When set, a finalized bundle larger than the limit aborts the build with a loud error before anything ships. Default unset.

## Alternatives considered

- **Post-process via a separate Node script after `vite build`.** Rejected. Adds a second build step and steps outside the Vite plugin contract. The `writeBundle` hook gives a clean place to run cleanup inline.
- **Patch `vite-plugin-singlefile` upstream.** Rejected. The attributes are correct from singlefile's perspective; it cannot know the consumer will inline. The fix belongs at the consumer boundary.
- **Hand-write a small HTML parser instead of regex.** Rejected for v0.1. Three narrow regexes against a known generator are tractable. Risk is mitigated by structural post-condition assertions in the build integration test (`no crossorigin`, `no rel="stylesheet"`).

## Consequences

- The plugin couples tightly to `vite-plugin-singlefile`'s current emitted form. Upstream churn could break the regexes silently. PRD 003 section 11 mitigates this with two measures: pin `vite-plugin-singlefile` as a peer dependency with a narrow range, and assert post-conditions structurally rather than by counting replacements.
- Removing `type="module"` would break every DOM-touching widget. This ADR documents the constraint so future maintainers do not strip it as a "dead attribute."
- The `sizeLimit` parameter rejects oversized bundles loudly before shipping. Authors opt in per skill.

## References

- [ADR 0001 - Bundler choice (Vite + `vite-plugin-singlefile`)](./0001-bundler-vite-singlefile.md)
- [PRD 003](../prds/003-phase-3-visill-build.md) sections 4 and 5 - lift map and plugin contract
- `claude-skill-decision-tree/vite.config.ts` lines 18-53 - original implementation
- `vite-plugin-singlefile` documentation
