---
name: <<SKILL_NAME>>
description: <<SKILL_DESCRIPTION>>
---

# <<SKILL_TITLE>>

A visill-powered hello-world skill. Given a `name`, the widget renders "Hello, <name>!" inline and confirms the visill toolchain is wired end to end - SDK runtime, build assembly, and render-time payload validation.

Use this skill as a starting point for your own visill widget. Replace the schema, the mustache slot in `widget-src/widget.html`, and the rendering logic in `widget-src/widget.ts` with the shape your skill needs. The data flow below stays the same.

## Schema

The render-time payload must satisfy this JSON Schema. `render.py` validates the incoming JSON against it before chevron-rendering the widget bundle:

{{SCHEMA}}

The `{{SCHEMA}}` slot above is replaced at skill build time with the inlined schema, so the published `SKILL.md` ships a single self-contained document.

## Data flow

Four layers move data from skill invocation to rendered DOM. Every visill skill follows this flow; only the field names and widget rendering change.

1. **Schema input.** Claude builds a JSON payload matching `assets/schema.json`. For this skill, that means `{"name": "world"}`.
2. **render.py (Python, canonical).** Reads stdin, validates against the schema, derives `<key>_json` mustache variants (JSON-encoded strings) for every top-level key, then chevron-renders `widget-src/widget.html`.
3. **Data island.** The rendered bundle carries an inline `<script id="root-data" type="application/json">` whose body is `{"name": <name_json>}`. JSON encoding survives HTML escaping because of the triple-stache `{{{name_json}}}` in the source template.
4. **Widget (TypeScript).** `widget-src/widget.ts` reads the data island via `readDataIsland`, formats `Hello, ${name}!`, and renders it into `#root`. The widget owns presentation; render.py never builds DOM strings.

Skill authors typically only edit layers 1 and 4. The Python layer stays generic; the data island is automatically derived from the schema's top-level keys.

## Usage

Construct a JSON payload matching the schema, then pipe it through `render.py` via stdin (heredoc) - never via a temp file, never via shell argv:

```
python3 ${CLAUDE_SKILL_DIR}/scripts/render.py <<'EOF'
{"name": "world"}
EOF
```

`render.py` validates the payload, derives `<key>_json` variants for every top-level key, and chevron-renders the widget bundle. Capture stdout and pass it to `visualize:show_widget` as `widget_code`.

Call shape for `visualize:show_widget`:

- `title`: a kebab-case identifier for this render, for example `hello_world_greeting`.
- `loading_messages`: 3-4 short messages shown while the widget mounts.
- `widget_code`: the stdout from `render.py`.

The widget displays the greeting and exposes a single button that sends the rendered text back via `sendPrompt`. Handle that submission in your follow-up turn to produce whatever artifact the skill is designed to deliver.
