# PRD 004 - Phase 4: Canonical `render.py` + Vendored Chevron

Status: Proposed
Owner: jordan.lawrence@sanity.io
Date: 2026-05-27

## 1. Goal

Land a canonical `render.py` and a clean vendored chevron copy under the scaffolder template. Merge the two production variants (linear-editing, decision-tree) into one source of truth that meets the design doc's runtime constraints and drops domain-specific validators. Every scaffolded visill skill ships with this runtime contract.

## 2. Scope

In:
- One canonical `render.py` at `packages/create-visill/template/skill-src/scripts/render.py`.
- Vendored chevron at `packages/create-visill/template/skill-src/scripts/_vendor/chevron/` lifted from linear-editing (clean copy, no `__pycache__/`).
- A `.gitignore` next to the script that excludes `__pycache__/` and `*.pyc`.
- LICENSE for chevron preserved verbatim under `_vendor/chevron/`.

Out:
- Node-side parity renderer. Python is the contract (design doc scope boundary).
- Domain-specific validators inside the canonical template (DT's `validate_tree_depth` is per-skill code, explicitly excluded).
- `jsonschema` pip dependency or any runtime install. Roll-our-own validator stays.
- Phase 5 render-test harness (depended on, not delivered here).
- Scaffolder copy logic (Phase 6 wires it in).

## 3. Deliverables

```
packages/create-visill/template/skill-src/scripts/
  render.py
  .gitignore                      __pycache__/, *.pyc
  _vendor/
    chevron/
      __init__.py
      main.py
      metadata.py                 version = '0.13.1'
      renderer.py
      tokenizer.py
      LICENSE                     upstream MIT, preserved
```

ADRs to land alongside: `docs/adrs/0011-render-py-stdin-contract.md`, `docs/adrs/0012-vendored-chevron-strategy.md`.

## 4. Merge Map

| Construct | Source | Reference |
|---|---|---|
| Stdin read + empty-payload guard | identical in both | LE `render.py:108-111`, DT `:130-133` |
| `fail()` + `check_type()` + base `validate()` shape | identical | LE `:26-83`, DT `:26-79` |
| `encode_for_script_tag()` (`</` neutralisation) | LE only | LE `render.py:85-92` |
| `with_json_siblings()` recursive helper | LE only | LE `render.py:95-105` |
| `minItems` array validator | LE only | LE `render.py:72-74` |
| `key.endswith("_json")` filter on derivation | DT only | DT `render.py:143-149` |
| `validate_tree_depth()` | DT, EXCLUDED | DT `render.py:81-127` - per-skill, not framework |
| Chevron `renderer.py` `scope == 0` fix | DT | DT `_vendor/chevron/renderer.py:73` - LE has buggy `is 0` |

Net shape: LE's `render.py` top-level form (including `encode_for_script_tag`, `with_json_siblings`, `minItems`), with DT's `_json` suffix guard folded into `with_json_siblings`:

```python
for key, value in data.items():
    if key.endswith("_json"):
        continue
    enriched[f"{key}_json"] = encode_for_script_tag(value)
```

Chevron sources come from LE except `renderer.py`, which comes from DT for the `scope == 0` comparison. LE's `is 0` works on CPython for small ints but is incorrect and lint-fails on newer Pythons.

## 5. Behavioural Contract (Invariants)

Each invariant has a one-line Phase 5 assertion, deferred to `@visill/test`'s `createRenderTests()`.

1. **Stdin-only input.** No argv, no temp file. Empty stdin exits non-zero with a `usage:` message.
   - Phase 5 assertion: `runRender({stdin: ""})` rejects with stderr matching `/usage:/`.
2. **Schema-validate before render.** A payload that fails any supported validator must never reach `chevron.render`.
   - Phase 5 assertion: a payload missing a `required` key exits non-zero and the template read never runs (test via a deliberately-broken template that would crash if reached).
3. **`</` neutralisation in JSON-island values.** Every value embedded as `{{{key_json}}}` passes through `json.dumps(v).replace("</","<\\/")`.
   - Phase 5 assertion: payload containing `"</script>foo"` produces rendered HTML with `<\/script>` and no literal `</script>` inside the data island.
4. **`_json` siblings without `_json_json` double-derivation.** Keys already ending in `_json` are not re-encoded.
   - Phase 5 assertion: payload `{"foo_json": "{}"}` yields no `foo_json_json` key in the chevron context.
5. **Chevron renders the bundled template.** Output is exactly `chevron.render(template, with_json_siblings(data))` on stdout, exit 0.
   - Phase 5 assertion: a known-good payload produces byte-identical output to a snapshot.

## 6. Schema Validator Support Matrix

Supported:
- `type` (`string`, `object`, `array`, `number`, `boolean`, `null`)
- `required`
- `properties` (recursed)
- `additionalProperties: false`
- `items` (recursed)
- `minItems`
- `enum`

Intentionally not supported (out of scope - skill authors stay within the supported set, or add their own validator post-scaffold):
- `anyOf` / `oneOf` / `allOf`
- `format`
- `pattern`
- `maxItems`, `minLength`, `maxLength`, `minimum`, `maximum`
- `$ref` / `definitions` / `$defs`

Rationale: the three existing skills use none of the excluded keywords. Supporting them honestly requires `jsonschema`, which the design doc's "zero pip install at runtime" rule forbids.

## 7. Chevron Vendoring Strategy

- Source: chevron 0.13.1, MIT-licensed, lifted from linear-editing's clean tree.
- Files: `__init__.py`, `main.py`, `metadata.py` (carries `version = '0.13.1'`), `renderer.py` (DT variant with `scope == 0`), `tokenizer.py`, `LICENSE`.
- No `pip install` at host runtime. `render.py` adds `_vendor` to `sys.path` before importing.
- Upgrade flow: bump in the template, run Phase 5's render tests, ship via `create-visill` minor. Scaffolded skills do not auto-upgrade (no upgrade path - design doc).
- `__pycache__/` is gitignored at the scripts directory so byte-compiled artefacts never enter the template or a built `skill/` zip.

## 8. Success Criteria

- A fixture payload piped to `render.py` validates and produces a rendered HTML document on stdout, exit 0.
- The same fixture with a missing required key exits non-zero with `render.py: root: missing required property 'x'` on stderr and nothing on stdout.
- The same fixture with a value containing `</script>` produces output where the embedded JSON island carries `<\/script>`, and the rendered HTML round-trips through a browser DOM parser without truncation.
- A payload key ending in `_json` is not re-derived: no `*_json_json` keys reach chevron.
- The script runs on Python 3.10+ with no third-party imports beyond `_vendor/chevron`.

## 9. Commits Within This Phase

1. `feat(create-visill): vendor chevron 0.13.1 under template`
2. `feat(create-visill): add canonical render.py with stdin contract`
3. `feat(create-visill): gitignore __pycache__ under template scripts`
4. `docs: add ADR 0011 render.py stdin contract`
5. `docs: add ADR 0012 vendored chevron strategy`

## 10. Dependencies

- Depends on: Phase 1 (monorepo skeleton + `packages/create-visill/` placeholder).
- Blocks: Phase 5 (`@visill/test` `createRenderTests()` asserts the five invariants); Phase 6 (scaffolder copies `template/skill-src/scripts/` into generated skills).

## 11. Risks + Mitigations

- **Python version floor.** `render.py` uses no 3.10-only syntax today, but the design doc pins 3.10+. Mitigation: add a `sys.version_info` guard at the top of `render.py` that fails fast with a clear message on 3.9 or older.
- **Chevron upstream drift.** Upstream may patch the same bugs we sidestep, or break. Mitigation: pin the version in `metadata.py`, gate any bump on Phase 5 render tests, never auto-update.
- **Author edits losing fixes.** Once scaffolded, the skill author owns the file. They may add a domain validator (fine) or revert the `</` neutralisation (not fine). Mitigation: Phase 5's `createRenderTests()` runs in every scaffolded skill's CI, catching drift at PR time rather than at runtime.
- **`_vendor/chevron/LICENSE` accidentally omitted.** Mitigation: the Phase 5 bundle preset asserts its presence.

## 12. Open Questions

- Should we vendor `jsonschema` (or a slim equivalent) to widen validator coverage to `anyOf` / `pattern` / `format`? LE and DT roll their own, and the three existing skills do not need the extras. Lean: keep rolling our own until a fourth skill shows a real need.
- Should `render.py` accept a `--schema` / `--template` override flag for local development, or stay strictly path-derived? Lean: stay strict; local dev runs through `vite` plus a fixture loader.
- Should the `.gitignore` live at `scripts/` or at `skill-src/`? Lean: `scripts/` keeps the rule next to what it protects.
