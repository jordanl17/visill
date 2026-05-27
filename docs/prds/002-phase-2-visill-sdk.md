# PRD 002 - Phase 2: `visill` SDK package

Status: Shipped 2026-05-27. Owner: jordan.lawrence@sanity.io. Date: 2026-05-27.

## 1. Goal

Ship the widget-side runtime SDK as the `visill` npm package: seven tree-shakeable, ESM-only exports that replace the helpers copy-pasted across the three existing widget repos. Phase 2 is library-only - no scaffolder, no Vite plugins, no eval helpers.

## 2. Scope

In:

- The seven exports defined in `docs/design/visill-overview.md` "SDK API sketch": `sendPrompt`, `readyDOM`, `requireElement`, `ownDescendant`, `delegate`, `readDataIsland`, `buildPrompt`.
- Public ambient type for `globalThis.sendPrompt`.
- Vitest unit test per export under JSDOM.
- A `.d.ts` snapshot test locking the public surface.
- ADR `0009-sdk-public-api-surface.md` landing in the same phase.

Out:

- State primitive (rejected, see `docs/rejected/state-primitive-in-sdk.md`).
- Tagged prompt builders (INCLUDED / UPDATE / DISCARDED).
- Host adapter, polyfill, or headless renderer.
- Vite plugins (`@visill/build`, Phase 3).
- Vitest presets and eval helpers (`@visill/test`, Phase 4).
- Scaffolder (`create-visill`, Phase 6).

## 3. Deliverables

All paths under `packages/visill/`.

| File | Purpose |
|---|---|
| `package.json` | Name `visill`, `type: "module"`, `exports` map, `sideEffects: false`, zero runtime deps |
| `tsconfig.json` | Strict, `moduleResolution: "bundler"`, emit `.d.ts` |
| `src/host.ts` | `sendPrompt` re-export + ambient `globalThis.sendPrompt` declaration |
| `src/ready-dom.ts` | `readyDOM(init)` |
| `src/require-element.ts` | `requireElement<T>(selector, root?)` |
| `src/own-descendant.ts` | `ownDescendant<T>(root, selector)` |
| `src/delegate.ts` | `delegate(root, selector, event, handler)` |
| `src/data-island.ts` | `readDataIsland<T>(scriptId)` |
| `src/prompt.ts` | `buildPrompt(sections)` |
| `src/index.ts` | Re-exports the seven names |
| `src/<name>.test.ts` | One Vitest file per export, JSDOM env |
| `src/public-api.test.ts` | `.d.ts` snapshot lock |
| `vitest.config.ts` | `environment: "jsdom"` |

## 4. Lift map

| Export | Source / model |
|---|---|
| `sendPrompt` | Re-export of `globalThis.sendPrompt`. Ambient declaration matches the three identical `globals.d.ts` files (e.g. `claude-targettable-feedback/widget-src/globals.d.ts`). Net new in shape only; the global is the contract |
| `readyDOM` | Net new wrapper. Models the rationale comment in `claude-skill-decision-tree/widget-src/widget.ts` lines 18-21 ("main() runs after DOMContentLoaded so the inline data script is in the DOM regardless of where the bundler placed our module script"). Implementation: if `document.readyState === "loading"` attach `DOMContentLoaded` once, otherwise call `init()` synchronously |
| `requireElement` | Direct lift from `claude-skill-decision-tree/widget-src/widget.ts` lines 53-57. Identical body in linear-editing and targettable-feedback. Add optional `root: ParentNode` defaulting to `document` |
| `ownDescendant` | Lift from `claude-targettable-feedback/widget-src/widget.ts` lines 24-31, generalised: replace the hard-coded `.unit` ancestor with a `selector`-driven scope where `element.closest(selector) === root` |
| `delegate` | Net new. Model: `claude-skill-linear-editing/widget-src/widget.ts` uses `event.target.closest(selector)` for click delegation throughout. Implementation: attach one listener to `root`, on event find `(event.target as Element).closest(selector)`, confirm the match is a descendant of `root`, invoke the handler with `(event, matchedElement)`, return an unsubscribe function |
| `readDataIsland` | Net new wrapper around the pattern repeated in all three widgets (e.g. linear-editing line 56: `JSON.parse(dataNode.textContent ?? '{}')`). Combines `requireElement` for the `<script>` with a `JSON.parse`, throwing a clear error when `textContent` is empty |
| `buildPrompt` | Net new. Filter `null` and `undefined`, join remaining strings with `\n`. Models the ad-hoc multi-section prompt concatenations in linear-editing's submit flow |

## 5. Test plan

Each export gets one `src/<name>.test.ts`. JSDOM env. No external deps.

- `host.test.ts` - install a `globalThis.sendPrompt` spy; assert `sendPrompt("hi")` forwards exactly once with `"hi"`.
- `ready-dom.test.ts` - two cases: `readyState === "loading"` (mocked via `Object.defineProperty`) defers until a dispatched `DOMContentLoaded`; `readyState === "complete"` runs synchronously.
- `require-element.test.ts` - returns the element; throws with a selector-bearing message when absent; honours an explicit `root` and ignores matches outside the subtree.
- `own-descendant.test.ts` - finds a direct descendant; skips a match that belongs to a nested instance of `root`'s selector class (regression from targettable-feedback's `.unit` nesting); returns `undefined` when nothing matches.
- `delegate.test.ts` - fires for a click on a matching descendant; fires for a click on a child of the matching descendant (`closest` lift); ignores non-matches; the returned unsubscribe stops further calls; ignores selector matches outside `root`.
- `data-island.test.ts` - parses `<script type="application/json">` JSON content; throws on a missing element; throws on empty `textContent` with a clear message.
- `prompt.test.ts` - filters `null` and `undefined`; preserves empty strings (explicit author choice) to lock the chosen behaviour; joins with single newlines.

## 6. Public API lock

`src/public-api.test.ts` reads the generated `dist/index.d.ts` as a string (via Node `fs`) and compares it against an inline snapshot. Renaming an export, changing a signature, or adding a new export fails the test until the snapshot is regenerated and the diff reviewed. CI runs `tsc --emitDeclarationOnly` before the test; locally Vitest depends on the build via a `pretest` script.

## 7. Success criteria

- All Vitest tests green in CI under Node 20 and 22.
- `pnpm pack` produces a tarball whose `package.json` advertises only ESM (`type: "module"`, `exports: { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }`), with no `main` and no `require` entry.
- Importing `{ requireElement } from "visill"` into a throwaway Vite consumer and building yields a bundle with zero source bytes from the six unused modules (verified by grep for known marker strings).
- ADR `0009-sdk-public-api-surface.md` merged in the same phase, status `Accepted`.
- Bundle size: index plus all seven modules under 2 KB minified, under 1 KB gzipped. Soft target, recorded as a CI artefact rather than a gate.

## 8. Commits within this phase

One commit per export, plus skeleton and lock. Order:

1. `chore(visill): scaffold package, tsconfig, vitest config`
2. `feat(visill): add sendPrompt re-export and ambient global typing`
3. `feat(visill): add readyDOM`
4. `feat(visill): add requireElement`
5. `feat(visill): add ownDescendant`
6. `feat(visill): add delegate`
7. `feat(visill): add readDataIsland`
8. `feat(visill): add buildPrompt`
9. `test(visill): lock public API surface via .d.ts snapshot`
10. `docs(adr): 0009 sdk public api surface`

## 9. Dependencies

- Depends on Phase 1 (monorepo scaffold, pnpm workspace, Changesets, oxlint + prettier, CI skeleton).
- Blocks Phase 6 (scaffolder template's `widget-src/widget.ts` imports from `visill`).
- Blocks the three migration PRs (Phase 7+), which swap inline helpers for `visill` imports.

## 10. Risks and mitigations

- **`sendPrompt` global typing leakage.** Declaring `globalThis.sendPrompt` from a published package can pollute consumer global scope. Mitigation: the declaration lives in `host.ts`, re-exported through `index.ts`, documented as a side-effect of importing `sendPrompt`. A consumer-project type test confirms `globalThis.sendPrompt` is typed only when `visill` is imported.
- **`delegate` selector matching when `event.target` is a descendant of the matched element.** `closest()` walks upward, so a click on a child of `selector` resolves to the ancestor correctly. The bug shape is selecting an element that itself contains `root` (e.g. `selector` matches a parent of `root`). Mitigation: assert `root.contains(matched)` before invoking the handler, covered by a dedicated test.
- **`ownDescendant` generalisation drift.** The original implementation pins scope via `.closest('.unit') === unit`. The generalised version takes a `selector` from the caller. When callers pass a non-class selector that matches `root` itself, behaviour stays correct (closest returns root). Mitigation: a test covers the nested-instance case from targettable-feedback.
- **`.d.ts` snapshot churn.** TypeScript version bumps can reformat declaration output. Mitigation: pin TS in this package's devDeps; snapshot comparison is whitespace-tolerant (trim plus collapse blank lines).
- **JSDOM gaps.** `DOMContentLoaded` timing in JSDOM is reliable but not identical to browsers. Mitigation: the test asserts behaviour via an explicit `readyState` mock plus event dispatch, not real timing.

## 11. Open questions

- `buildPrompt`: keep empty strings or filter them? Lean: keep, so authors can emit deliberate blank-line separators. Confirm at implementation time.
- `requireElement` default root: `document` or required? Lean: default to `document` for parity with the lifted source; the second arg is opt-in scoping.
- Should `readyDOM` support being called multiple times? Lean: yes, each call is independent; no internal queue.
- Should `delegate`'s handler receive `(event, target)` or `(event)` with `event.currentTarget` reassigned? Lean: pass `target` as a second arg and leave `event.currentTarget` untouched, matching browser behaviour for delegated listeners.
- Confirm `visill` is free on npm before Phase 2 lands its first publish (Phase 5). The fallback name `@visill/sdk` would require only a small `package.json` change, with no source impact.

## 12. Delivery

Shipped 2026-05-27. Direct push to `main` at `jordanl17/visill`. Commit `d6987de`. CI run `26485068643` green in 18s.

All five open questions resolved at implementation time per the listed leans. Four locked into ADR 0009; the npm-name check stays as a Phase 5 gate.

Package contents at delivery:
- Seven source files under `packages/visill/src/`: `host.ts`, `ready-dom.ts`, `require-element.ts`, `own-descendant.ts`, `delegate.ts`, `data-island.ts`, `prompt.ts`.
- Seven matching `*.test.ts` files plus `public-api.test.ts` snapshot lock. 23 tests, all green under JSDOM via Vitest 2.1.9.
- `src/index.ts` re-exports the seven names in design-sketch order.
- `tsconfig.build.json` excludes `*.test.ts` so the tarball ships only runtime files.
- `tsconfig.node.json` covers `vitest.config.ts` for the LSP.

ADR 0009 landed in the same commit with status `Accepted`. ADR index row flipped.

Tarball spot check (`pnpm pack` from `packages/visill/`): ships `package.json`, `LICENSE`, and 32 files under `dist/` (eight `.js` plus their `.js.map`, `.d.ts`, `.d.ts.map` siblings). No `src/`, no test files, no config. Raw size of the eight runtime `.js` files: 2,197 bytes.

## 13. Lessons learned

- **Sub-agent prettier drift.** Eight Wave-1 sub-agents authored TypeScript in mixed styles (mostly double quotes plus stray semicolons). The workspace `.prettierrc` mandates the opposite. The final review caught it; the coordinator ran `prettier --write` to fix; the reformat then broke the `.d.ts` snapshot test because the snapshot pinned the unformatted form. Codified the fix in CLAUDE.md and the playbook: every sub-agent brief that authors TS/JS/JSON repeats the prettier rules verbatim, and the coordinator runs `prettier --write` between each wave and its review-diff gate. Snapshots and downstream prompts now read the formatted form by construction.
- **Tarball test bleed.** Default `tsc` compiled `*.test.ts` files into `dist/`, and `files: ["dist"]` shipped them. Split into `tsconfig.json` (covers tests for typecheck and IDE) and `tsconfig.build.json` (excludes tests for emit). `build` and `pretest` scripts point at the build config; `typecheck` stays on the root.
- **`pnpm pack` rejects `--filter`.** `pnpm --filter <pkg> pack` injects `--recursive`, which `pack` refuses. Use `cd packages/<pkg> && pnpm pack` instead. Worth a script alias when the publish flow lands in Phase 7.
- **ADR over-specified the host ambient.** Draft ADR 0009 promised a richer `interface Window` plus `var sendPrompt` augmentation than what the three source repos actually use. Trimmed the ADR to match the implementation (`declare global { function sendPrompt(text: string): void }`) before the snapshot locked it. Pattern: validate ADR text against the lift source, not against speculative consumer ergonomics.
- **Commit message style.** User wants every commit to be a Conventional Commits title and nothing else - no body, no co-author, no trailers. Captured in CLAUDE.md, PHASE-PLAYBOOK.md, and a memory entry.
- **Auto-proceed Stage 7.** User wants Stage 6 green to flow straight into Stage 7 without a confirmation pause. Captured as a feedback memory for future phases.
