# Testing and eval strategy

> NOTE: Evals run locally only. CI does not execute them (see ADR 0022).

Four test surfaces, in order of increasing effort. Pick the right one for the change you're making.

| Surface                            | What it catches                                                                                                                       | When to run                                                                                                | Time    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------- |
| 1. Vitest unit + integration suite | Widget runtime bugs (script init, event handlers, payload shape), bundle integrity (`type="module"` preservation, slot tokens, size budget) | After editing `widget-src/widget.ts`, `vite.config.ts`, or any build path. Runs automatically on every PR. | ~1 sec  |
| 2. Manual trigger walkthrough      | Whether SKILL.md description fires/skips correctly in real Claude Code                                                                | After editing the SKILL.md `description:` frontmatter                                                      | ~5 min  |
| 3. Programmatic eval suite         | Trigger precision plus widget output correctness                                                                                      | After editing SKILL.md body, parsing rules, or anything in `widget-src/`                                   | ~10 min |
| 4. Description optimization        | Trigger-rate tuning across many phrasings                                                                                             | Once the description is stable enough to optimise                                                          | n/a     |

## Surface 1: Vitest unit + integration suite

Run with `pnpm test`. Three files in [`tests/widget/`](widget/):

- [`bundle.test.ts`](widget/bundle.test.ts) - static checks against the built `widget-bundled.html`: the inlined `<script>` declares `type="module"`, the chevron runtime slot tokens are preserved, the inline `#root-data` script tag is present, critical string literals survive terser, the bundle stays under the size budget.
- [`widget.test.ts`](widget/widget.test.ts) - jsdom-based runtime checks: spawns `python3 render.py` with a fixture payload piped via stdin, captures the rendered bundle, re-injects the module script as a plain `<script>` so jsdom executes it, then exercises interactions and verifies `sendPrompt` is called with the right payload.
- [`render.test.ts`](widget/render.test.ts) - exercises `render.py` directly via `spawnSync`. Happy path fills all slots; missing required slot, invalid JSON, and bad payload types all exit non-zero with a clear stderr message.

The widget template uses chevron (Mustache) markers; `render.py` does the substitution at skill runtime against the validated payload. `widget.test.ts` invokes the same `render.py` so the jsdom interaction tests exercise the full template-to-HTML pipeline end-to-end.

This is the layer that catches "the script runs but nothing happens" bugs - exactly what the eval suite (which only grades static HTML) cannot.

Runs on every PR via `.github/workflows/build.yml`. Also runs in the release workflow before the zip step, so a broken bundle cannot reach a release.

## Surface 2: Manual trigger walkthrough

The checklist lives at [`tests/trigger-cases.md`](trigger-cases.md). Type each prompt into a fresh Claude Code session in an unrelated directory. The activate-or-skip decision is observable in CC's output (does it read `SKILL.md`, reference `assets/widget-bundled.html`, attempt `show_widget`?).

Use this as a quick sanity check whenever you touch the description.

## Surface 3: Programmatic eval suite

Scaffold lives in [`tests/evals/`](evals/). Each iteration:

1. **Pick an iteration number** (last one is in `hello-world-workspace/iteration-N`).
2. **Read [`tests/evals/orchestrator.md`](evals/orchestrator.md).** It has the setup commands and the two prompt templates (with_skill + baseline). A Claude Code agent spawns N background subagents in one Agent-tool batch and the system notifies on each completion.
3. **Run** the eval suite via `pnpm test:evals` (or the orchestrator-driven flow for the full with_skill / baseline comparison).
4. **Grade** when all subagent runs are done:
   ```bash
   pnpm tsx tests/evals/grade.ts hello-world-workspace/iteration-N
   ```
   Writes `grading.json` per run with `{expectations: [...], summary: {pass_rate, ...}}`. Each assertion is programmatic (regex/string match against the widget HTML or response text).
5. **Build a visual review:**
   ```bash
   pnpm tsx tests/evals/build_preview.ts hello-world-workspace/iteration-N
   open hello-world-workspace/iteration-N/eval-preview.html
   ```
   Shows each widget rendered inline with design-system fallbacks, alongside the grading. Per-scenario feedback textareas auto-save to localStorage; the "Copy feedback JSON" sticky button exports the payload.

### Per-case interpretation

For the hello-world template the assertions are minimal:

- **fire-\*** cases must show `meta.activated=true`, no leaked `{{TOKEN}}` placeholders, and a parseable `#root-data` script carrying a non-empty `name` string.
- **skip-\*** cases must show `meta.activated=false` and no widget HTML.

A failure on a fire case means the model declined to activate when it should have, or the rendered bundle is missing the expected payload. A failure on a skip case means the model activated when it shouldn't, or produced widget HTML for a conversational prompt.

### Editing the widget sources

The widget ships as `skill/<skill-name>/assets/widget-bundled.html` (a single file with CSS and JS inlined). The split sources live outside the skill folder at `widget-src/` (`widget.html`, `widget.css`, `widget.ts`, `globals.d.ts`) so they don't bloat the distributed zip. After editing any source, regenerate the bundle:

```bash
pnpm install      # first time only
pnpm typecheck    # optional, recommended after TS edits
pnpm build
```

`pnpm build` runs Vite (`vite.config.ts`), which transpiles the TypeScript via esbuild, minifies the CSS with lightningcss and the JS with terser, then inlines everything into a single HTML file via `vite-plugin-singlefile`. `scripts/build-zip.sh` invokes the build automatically before zipping locally, and the release workflow runs it before producing the GitHub release zip - so the released artifact always reflects the latest source.

## Surface 4: Description optimization

<!--
PLACEHOLDER: notes on whether the description optimizer (skill-creator's
run_loop.py) works for this skill.

The optimizer uses `claude -p`, which cannot invoke
visualize:show_widget. Widget-based skills often see recall=0% because
the model rationally refuses to invoke a skill whose primary tool is
unavailable. Either stub show_widget in the optimizer harness, or use
Surface 1 / Surface 2 as proxies for trigger precision.
-->

## Workspace hygiene

`hello-world-workspace/` is gitignored. It holds:

- per-iteration eval results (`iteration-N/`)
- snapshot copies of the skill (`skill-snapshot-iter-N/`)
- the eval-preview.html that `build_preview.ts` writes

Nothing in this directory needs to be committed. The scaffolding in `tests/evals/` is what's reproducible.
