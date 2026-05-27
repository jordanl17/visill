# ADR 0012: render.py JSON-island encoding

- Status: Accepted
- Date: 2026-05-27

## Context

A visill widget ships a JSON island inside its bundled HTML: a `<script type="application/json">…</script>` block that the runtime parses to hydrate the DOM. The renderer drops payload values into that block through the chevron template. Two bugs in the source repos motivate the rules locked here.

First, an unescaped `</script>` literal inside any embedded value terminates the surrounding script tag early. The HTML parser closes the island, the JSON parse step never runs against the intended payload, and downstream code reads garbage. Linear-editing hit this exact case and patched it with a `</` substitution; decision-tree carries the same defence.

Second, the template inlines per-key JSON siblings: for a payload `{ "foo": [...] }`, the template references `{{{foo_json}}}` to drop the value as a serialised JSON literal. Without a guard, a key that already ends in `_json` produces a `_json_json` sibling, clutters the chevron context, and risks double-encoding. Decision-tree's `render.py` lines 143-149 add a single-derivation guard; linear-editing does not. The canonical renderer adopts the guard.

This ADR locks both rules so every scaffolded skill ships them and Phase 5's `createRenderTests()` can assert them as invariants 3 and 4.

## Decision

The canonical `render.py` carries two helpers, applied uniformly to every value that reaches the template context.

1. **`</` neutralisation.** `encode_for_script_tag(value)` returns `json.dumps(value, ensure_ascii=False).replace("</", "<\\/")`. The result is valid JSON: `JSON.parse` on the consumer side normalises `<\/` back to `</`. The replacement prevents the HTML parser from seeing a `</script>` sequence inside the script body, so the island closes only on the renderer-emitted closing tag.

2. **`_json` siblings, with single-derivation guard.** `with_json_siblings(data)` walks a dict and adds a `{key}_json` sibling for each entry, populated by `encode_for_script_tag(value)`. A key already ending in `_json` is skipped, which rules out `_json_json` double-derivation. The walker recurses into nested dicts so deep payloads gain siblings at every level.

The chevron template authors reference these siblings with `{{{key_json}}}` (triple-mustache, no HTML escaping) to inline a serialised JSON literal into the script tag.

## Alternatives considered

- **HTML-escape the entire JSON blob (`&lt;`, `&gt;`).** Rejected. The consumer reads the script body as JSON, not as HTML; entity references break `JSON.parse` on the first character.
- **Templating-level escaping via a chevron filter.** Rejected. Chevron has no filter mechanism, and adding one forks the vendored copy. Even with a filter, every skill author has to remember the call at every reference site.
- **JSON-encode in the template (`{{value | json}}`).** Rejected. Equivalent expressiveness on paper, but pushes encoding responsibility onto skill authors. A forgotten filter ships a broken island. Encoding in the renderer once, before the template sees the data, removes the footgun.
- **No `_json` derivation; authors call `JSON.stringify(...)` themselves.** Rejected. The framework exists to make the runtime contract uniform. Per-skill stringify calls drift, miss the `</` rule, and reintroduce the bugs this ADR closes.

## Consequences

- Skill authors write `{{{key_json}}}` in templates to inline serialised values. The renderer guarantees safety inside `<script>` tags; authors do not re-encode.
- The `</` neutralisation round-trips through `JSON.parse`: clients reading the island via `JSON.parse(scriptEl.textContent)` recover the original string with `</` intact.
- Payloads containing user-controlled values with literal `</` are safe by default. No skill-specific sanitisation needed.
- The `_json` suffix is a reserved convention. Authors who name a payload key `foo_json` accept that the value passes through verbatim and gains no further sibling. Phase 5 invariant 4 asserts this.
- The `with_json_siblings` walker mutates only by adding siblings; original keys remain untouched. Templates that reference the raw key still work.

## References

- [PRD 004 §4 Merge Map](../prds/004-phase-4-canonical-render-py.md#4-merge-map)
- [PRD 004 §5 invariants 3 and 4](../prds/004-phase-4-canonical-render-py.md#5-behavioural-contract-invariants)
- Implementation: `packages/create-visill/template/skill-src/scripts/render.py` - `encode_for_script_tag` and `with_json_siblings`.
- Linear-editing source: `claude-skill-linear-editing/skill-src/scripts/render.py:85-105`.
- Decision-tree source: `claude-skill-decision-tree/skill-src/scripts/render.py:143-149`.
