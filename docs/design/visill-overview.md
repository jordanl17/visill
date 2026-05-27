# visill - design doc

Captures the decisions reached after reviewing `claude-targettable-feedback`, `claude-skill-decision-tree`, and `claude-skill-linear-editing` and mining their Claude Code session histories. Status: pre-code. Owner: jordan.lawrence@sanity.io. Date: 2026-05-27.

## What visill is

Two npm packages that let an author build a "visual Claude skill" (a `visualize:show_widget` skill rendered in claude.ai web or Claude Desktop) without re-deriving the bundling, render pipeline, and release plumbing.

- `create-visill` - the `npm create visill` scaffolder.
- `@visill/sdk` - widget-side SDK runtime.

Not in scope: Claude Code skills, the Anthropic API, claude.ai-anywhere-else. Visual skills only.

## Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Bundler | Vite + `vite-plugin-singlefile` |
| 2 | First slice | All three existing skills migrated in lockstep against v0.1 |
| 3 | Repo topology | Monorepo, Changesets, independent semver per package |
| 4 | Template flavour | Single, full-featured: always `render.py` + chevron + JSON data-island |
| 5 | SDK scope | DOM helpers + event delegation. No state primitive, no tagged prompt builders |
| 6 | Eval harness | Ship `orchestrator.md` text + `grade.ts` + `build_preview.ts`. No CLI |
| 7 | Chevron distribution | Scaffolder copies vendored chevron into each skill (zero pip install at runtime) |
| 8 | Defect backport | Land mechanical fixes across the 3 existing repos *before* v0.1 work begins |
| 9 | Built `skill/` directory | Gitignored. Release zip is the artefact |
| 10 | Dev-aid Claude Code skills | Scaffolded into `.claude/skills/` in each visill repo. Remove `.claude/` from default gitignore |
| 11 | Description optimiser | Out of scope for v0.1. Ship a build-time 1024-char validator only |
| 12 | pnpm pin | `packageManager` field only. No `version:` in `pnpm/action-setup` |
| 13 | npm names | `@visill/sdk` + `create-visill` (bare scaffolder, scoped SDK) |
| 14 | Lint + format | oxlint + prettier |
| 15 | Next step | This design doc (no code yet) |

## Architecture (the consensus shape across the three repos)

Source layout per scaffolded skill:

```
widget-src/                     editable widget sources (Vite root)
  widget.html  widget.css  widget.ts  globals.d.ts
skill-src/                      editable skill sources
  SKILL.md                      template with {{SCHEMA}} slot
  assets/schema.json            payload contract
  scripts/render.py             stdin-only renderer
  scripts/_vendor/chevron/      vendored Mustache impl
  references/                   mustache-syntax.md, schema-authoring.md
tests/
  widget/{bundle,widget,render}.test.ts
  evals/{evals.json, grade.ts, build_preview.ts, orchestrator.md, shared.ts}
  EVALS.md  trigger-cases.md
.claude/skills/                 dev-aid CC skills (NOT in .gitignore)
scripts/build-zip.sh
.github/workflows/{build,release}.yml
vite.config.ts                  imports plugins from `visill/build`
package.json                    "packageManager": "pnpm@x.y.z"
release-please-config.json
visill.config.ts                (removed in Phase 6.1 - see ADR 0025)
```

Build pipeline (Vite + two plugins shipped by `visill/build`):

1. `finalizeBundle()` - reads emitted `widget.html`, drops `rel="stylesheet" crossorigin` on inlined `<style>`, drops `crossorigin` on the module script while preserving `type="module"`, squashes blanks, renames to `widget-bundled.html`.
2. `assembleSkill()` - injects `schema.json` as a fenced block into `SKILL.md` at the `{{SCHEMA}}` slot, copies `assets/schema.json`, recursive-copies `scripts/` (chmod `render.py` 0755), copies `references/` + `LICENSE` into `skill/<name>/`.

Runtime data flow:

```
Claude --(JSON via heredoc stdin)--> python3 render.py --(stdout)--> visualize:show_widget
                                            |
                                            +-- validates against schema.json
                                            +-- with_json_siblings: derives <key>_json
                                            +-- json.dumps(v).replace("</","<\\/")
                                            +-- chevron.render(widget-bundled.html, data)
```

Widget reads its own `<script id="..." type="application/json">` block via `JSON.parse(node.textContent)`. Widget posts back via `globalThis.sendPrompt(text)`.

Templating: `{{key}}` for HTML-escaped text contexts, `{{{key_json}}}` for raw JSON inside the data island. No sections, no partials, no conditionals in templates (chevron supports them but the three skills don't use them).

Release: release-please opens version PR, on merge the second job zips `skill/<name>/` and uploads to GitHub release as `<name>.zip` and `<name>-<tag>.zip`.

## Patterns visill promotes

Each appears identically (or near-identically) in 2-3 of the existing repos and graduates into the framework:

1. Skill name derived from `package.json#name` minus `claude-skill-` prefix - single source of truth (the `visill.config.ts` override was removed in Phase 6.1; see ADR 0025).
2. `finalizeBundle` HTML post-pass (shared plugin).
3. `assembleSkill` copy + template + chmod pipeline (shared plugin).
4. `render.py` runtime: stdin-only, schema-validate, auto `_json` siblings, `</` neutralisation, chevron render.
5. Vendored chevron under `scripts/_vendor/`, zero pip-install at host runtime.
6. Inline `<script id="..." type="application/json">` data island as the widget bootstrap contract.
7. `requireElement<T>(selector)` and `ownDescendant<T>(root, selector)` helpers.
8. `sendPrompt` typed global.
9. Bundle-integrity Vitest preset parameterised by `{ tokens, literals, sizeLimit }`.
10. Eval orchestrator triad: `orchestrator.md` + `grade.ts` + `build_preview.ts`.
11. Release-Please workflow + `build.yml` PR gate.

## Anti-patterns visill designs against

Each entry lists the failure mode, where it bit, and the visill-side fix.

1. **Inline `onclick="..."` + `window.* = ...` assignments** (decision-tree). Fix: SDK ships `delegate(root, selector, event, handler)`; scaffolded template uses event delegation only.
2. **`tests/evals/shared.ts` carries cross-repo helpers** (`countTopLevelUnits`, `SLOT_TOKENS` in linear-editing despite being unused). Fix: scaffolder emits a minimal `shared.ts` containing only the Assertion type + loaders.
3. **`build_preview.ts` hardcoded summary stats** (`"47 / 47"`, `"8 scenarios x 2 conditions"`) survived from targettable-feedback through both later repos. Fix: scaffolder template reads `grading.json` for live stats.
4. **`evals.json` top-level key drift** - sample used `scenarios`, `build_preview.ts` reads `evals`. Fix: SDK exports typed `loadEvals(path)`; scaffolder template is consistent.
5. **`.prettierignore` missed `skill/` whole-dir** - assembled SKILL.md has injected multi-line JSON that breaks prettier. Fix: scaffolder ignores the entire built `skill/` tree (and since `skill/` is gitignored anyway, this becomes belt-and-braces).
6. **Boilerplate-leak strings** like `decision_tree_{short-descriptor}` written as live SKILL.md instructions. Fix: scaffolder uses `<<TOKEN>>` sentinels that error at build if unreplaced; runs a pre-flight check that no `claude-skill-{decision-tree,linear-editing,targetable-feedback}` strings survive scaffolding.
7. **`grade.ts` regex over rendered HTML counts JS template literals** (linear-editing's chip-counter false positive). Fix: SDK ships `parseDataIsland(html, scriptId)`; orchestrator template asserts via parsed payload, not DOM regex.
8. **Subagent `Write` permission blocks on `meta.json`** (2 of 6 baseline runs in linear-editing eval). Fix: orchestrator pre-creates `meta.json` stubs, agents `Edit`. Documented caveat in orchestrator.md.
9. **`type="module"` lost in build** - already protected by an assertion in all 3 repos; promote to framework-level bundle preset.
10. **`</script>` substring closes the JSON-island prematurely.** Fix: lives in canonical `render.py`, asserted by a bundle test.
11. **No-trailing-text-after-`show_widget` skeleton-lock.** Fix: scaffolded SKILL.md template encodes the rule explicitly; dev-aid skill flags violations.
12. **pnpm `version: 10` + `packageManager: pnpm@10.10.0` collision.** Fix: workflows omit the `version:` input entirely.

## Hard constraints (encoded by framework)

- SKILL.md `description` frontmatter must stay under **1024 characters**. Scaffolder + build emit a clear error with the count.
- Bundled `<script>` must keep `type="module"`. Bundle preset asserts.
- `render.py` accepts JSON only via stdin, never argv, never temp file.
- JSON-island contents pass through `json.dumps(v).replace("</","<\\/")` before embedding.
- Widget module init tolerates being hoisted near `<head>`: rely on `type="module"` defer or `DOMContentLoaded` guard via `readyDOM(init)`.
- `loading_messages` for `visualize:show_widget` are 3-4 short playful lines.
- Trailing prose after `show_widget` skeleton-locks the host. Keep the post-call message empty or a single short lead-in.
- Skill name derives from `package.json#name` minus `claude-skill-` prefix. Renaming = `package.json` edit + `mv`; nothing else hardcodes it.
- Brand colours in widget CSS are pinned hex deliberately. Framework does not abstract them.
- Verbatim rule (editor-style skills): preserve original assistant content byte-for-byte; framework does not provide an "improve" hook.
- Render hosts: claude.ai web + Claude Desktop. Not Claude Code, not `claude -p`, not the API.

## Scope boundaries (v0.1 explicitly excludes)

- Generalised eval grader. Each skill's assertions are bespoke. Framework ships runner + helpers, not a "graders for any widget" abstraction.
- Brand-token / design-system abstraction.
- Widget-side rendering framework (React, Vue, lit). Bundles stay ~10-15 KB.
- Schema-to-form generation.
- Description optimiser.
- `visualize:show_widget` polyfill or headless renderer.
- Multi-step / cross-widget flows.
- Node-side renderer "for parity" with `render.py`. Python is the contract.
- State primitive in the SDK. Each widget owns its state.
- Tagged prompt builders (INCLUDED / UPDATE / DISCARDED). Speculative until a fourth editor-style skill exists.

## Package layout

```
visill/                                 monorepo root, Changesets-managed
  packages/
    visill/                             the SDK
      src/
        host.ts                         sendPrompt re-export, readyDOM
        dom.ts                          requireElement, ownDescendant
        delegate.ts                     delegate(root, selector, event, handler)
        data-island.ts                  readDataIsland<T>(scriptId)
        prompt.ts                       buildPrompt(sections)
        index.ts                        public surface
      package.json                      name: "@visill/sdk", ESM-only, zero deps
    create-visill/                      the scaffolder
      src/index.ts                      prompts + copy
      template/                         the canonical scaffold
        widget-src/...
        skill-src/...
        tests/...
        .claude/skills/...
        .github/workflows/...
        package.json (template)
      package.json                      name: "create-visill"
    visill-build/                       Vite plugins
      src/finalize-bundle.ts
      src/assemble-skill.ts
      src/index.ts
      package.json                      name: "@visill/build" (scoped since "visill-build" reads oddly)
    visill-test/                        Vitest presets + eval helpers
      src/bundle-test.ts                createBundleTests({ tokens, literals, sizeLimit })
      src/eval-helpers.ts               loadEvals, assertion, summarize, parseDataIslandFromHtml
      src/index.ts
      package.json                      name: "@visill/test"
  .changeset/
  pnpm-workspace.yaml
  package.json
```

Note: scoped names `@visill/sdk`, `@visill/build`, and `@visill/test`; bare `create-visill` for the scaffolder so `npm create visill` works. Reads cleaner than `visill-build`. Confirm before publish.

## SDK API sketch

```ts
// visill/src/index.ts

export const sendPrompt: (text: string) => void;

export const readyDOM: (init: () => void) => void;

export const requireElement: <T extends Element = HTMLElement>(
  selector: string,
  root?: ParentNode,
) => T;

export const ownDescendant: <T extends Element = HTMLElement>(
  root: Element,
  selector: string,
) => T | undefined;

export const delegate: <K extends keyof HTMLElementEventMap>(
  root: Element,
  selector: string,
  event: K,
  handler: (event: HTMLElementEventMap[K], target: Element) => void,
) => () => void;

export const readDataIsland: <T>(scriptId: string) => T;

export const buildPrompt: (
  sections: ReadonlyArray<string | null | undefined>,
) => string;
```

Functional declarations throughout (per user preference). No classes, no `new`. ESM-only, side-effect-free.

## v0.1 contents

In:
- `@visill/sdk` with the 7 exports above.
- `@visill/build` with `finalizeBundle()` and `assembleSkill()`.
- `@visill/test` with `createBundleTests({...})`, `loadEvals`, `assertion`, `summarize`, `parseDataIslandFromHtml`.
- `create-visill` scaffolder producing a single full-featured template.
- Scaffolded `.claude/skills/` with starter dev-aid skills (skill-creator-flavoured but for visill).
- `release-please-config.json` + workflows with the pnpm fix.
- Hello-world skill that builds, tests, and ships a working zip on first scaffold.

Out:
- Alternate template flavours.
- Eval CLI.
- Description optimiser.
- State primitive / tagged prompt builders.

## Migration plan for the 3 existing repos

Lockstep migration against v0.1. Phasing:

1. **Pre-flight (before any visill code)**: backport the 5 documented defects to all 3 repos as small mechanical PRs.
   - build_preview hardcoded stats
   - evals.json key drift (where applicable)
   - .prettierignore covers `skill/` fully
   - decision_tree_{slug} pattern in linear-editing SKILL.md
   - release.yml `pnpm/action-setup` missing version-pin fix (linear-editing)
   - Plus the dead `SLOT_TOKENS` / `UNIT_DATA_ID_PATTERN` cleanup in linear-editing `shared.ts`
2. **visill v0.0.1**: stand up the monorepo, Changesets, CI. No usable packages yet.
3. **visill v0.1.0**: ship the four packages with hello-world scaffold passing tests.
4. **Migration PRs (one per repo, parallel)**: rewire `vite.config.ts` to import from `@visill/build`, replace ad-hoc helpers with `@visill/sdk` imports, replace bundle test with `createBundleTests({...})`, gitignore `skill/`, update release flow, add `.claude/skills/`.
5. **Sanity check**: each migrated repo builds the same-or-smaller bundle, ships the same-shape zip, passes the same evals.

## Documentation architecture

The monorepo carries a first-class documentation space so trade-offs and rejected options stay legible months later:

```
visill/
  docs/
    README.md                       index pointing at the categories below
    adrs/                           Architecture Decision Records
      0001-bundler.md               Vite vs Parcel vs Rolldown
      0002-monorepo-with-changesets.md
      0003-single-full-featured-template.md
      0004-render-py-stdin-contract.md
      0005-dev-aid-skills-in-dot-claude.md
      0006-gitignore-built-skill-dir.md
      0007-description-1024-char-cap.md
      ...
    design/                         broader design docs (this file moves here)
      visill-overview.md            this document
      sdk-api.md                    rationale per SDK export
      eval-harness.md               orchestrator + grade + preview shape
      migration-plan.md             per-repo migration playbook
    rejected/                       options considered and dropped, with reasoning
      parcel-bundler.md
      state-primitive-in-sdk.md
      eval-cli-command.md
      brand-token-abstraction.md
      schema-to-form-generation.md
```

ADR conventions:

- Each ADR is numbered, dated, has a status (`Proposed` / `Accepted` / `Superseded by NNNN` / `Deprecated`).
- Sections: **Context**, **Decision**, **Alternatives considered** (with why-not), **Consequences**, **References**.
- ADRs are append-only - never rewrite a past decision in place; supersede via a new ADR that links back.
- Decisions in this design doc each map to a starter ADR; we backfill them while standing up the monorepo.

`rejected/` is deliberately separate: it captures options we chose not to take (Parcel, state primitives, eval CLI, etc.) so future Claude sessions and future humans can see the reasoning without re-litigating.

CLAUDE.md rule: the monorepo `CLAUDE.md` references the existence of `docs/` and its substructure but does NOT inline any of those documents. The wording should read roughly:

> Design docs and ADRs live under `docs/`. Index at `docs/README.md`. Pull specific documents into context only when the current task touches the decisions they cover. Do not load the entire `docs/` tree by default.

This keeps every Claude Code conversation context-light while letting an author or agent pull `docs/adrs/0004-render-py-stdin-contract.md` (etc.) on demand when working on that surface.

## Open items (not blocking design)

- Confirm `visill` is free on npm before committing to bare names. If taken, fall back to `@visill/sdk` + `@visill/create`.
- Decide whether `@visill/build` and `@visill/test` should be flattened back into `visill` as sub-paths (`visill/build`, `visill/test`) to reduce package count. Three-vs-four-package call.
- Initial set of dev-aid `.claude/skills/`: at minimum, "audit-skill-md-description-length", "verify-template-tokens-replaced", "run-evals". Define exact roster during scaffolder work.
- Whether the scaffolder asks any questions at all (skill name only? more?). Lean: ask skill name + description placeholder + author; nothing else.
- License (MIT? Apache-2.0?). Existing repos vary - check before scaffolder template hardcodes one.

## References

- `/Users/jordan.lawrence/Documents/repos/claude-targettable-feedback/`
- `/Users/jordan.lawrence/Documents/repos/claude-skill-decision-tree/`
- `/Users/jordan.lawrence/Documents/repos/claude-skill-linear-editing/`
- `/tmp/handoff-claude-skill-linear-editing-2026-05-25-1802.md`
- Session: `bbf2b105-a5ff-4612-916e-40acfa7c6d65` (targettable origin, "SDK around the claude container" quote)
