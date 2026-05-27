# PRD 005 - Phase 5: `@visill/test`

Status: Shipped. Owner: jordan.lawrence@sanity.io. Date: 2026-05-27.

## 1. Goal

Ship `@visill/test` v0.1: the shared Vitest preset + eval-helper package that lifts the bundle-integrity test, the `render.py` subprocess test, and the eval loader/aggregator/HTML-parse helpers out of the three existing skill repos. Locks the `evals.json` top-level key, fixes the regex-over-HTML false positive in linear-editing's grader, and drops the dead helpers in linear-editing's `shared.ts`.

## 2. Scope

In: six exports (`createBundleTests`, `createRenderTests`, `loadEvals`, `assertion`, `summarize`, `parseDataIslandFromHtml`) + five types (`Assertion`, `Grading`, `GradingSummary`, `Meta`, `RunOutputs`).

Out:
- A generalised eval grader. Per-skill assertions stay bespoke.
- A headless renderer for `visualize:show_widget`. Render tests cover `render.py`, not the host.
- Snapshot/golden management beyond Vitest's built-in `toMatchSnapshot`.
- A `build_preview.ts` binary. The aggregator ships as a library function; each skill wraps it thinly.

## 3. Deliverables

`packages/visill-test/`:
- `src/bundle.ts`, `src/render.ts`, `src/evals.ts` (loaders + `assertion` + `summarize` + types), `src/data-island.ts`, `src/index.ts`.
- `package.json` - `name: "@visill/test"`, ESM-only, peer-dep `vitest`.
- `test/fixtures/bundles/` - four broken bundle fixtures (section 6).
- `test/fixtures/render/` - Phase 4 canonical `render.py` + a minimal payload.
- Four meta test files (one per export group).

Adjacent docs: `docs/adrs/0013-bundle-test-preset-shape.md`, `docs/adrs/0014-render-test-via-subprocess.md`.

## 4. Lift map

- `createBundleTests` <- `claude-skill-decision-tree/tests/widget/bundle.test.ts` lines 26-98. Parameterise `skillName` (via `@visill/build`'s `resolveSkillName`), `doubleStacheTokens`, `tripleStacheTokens`, `literals`, `dataScriptId`, `dataScriptType`, `sizeLimit`.
- `createRenderTests` <- DT `tests/widget/render.test.ts` lines 12-13 (subprocess wrapper) plus the test-table shape (102-206). Drop DT's domain assertions; expose `payloads` (named fixtures) + optional `snapshotDir`. Each payload yields one `it`; rejection cases set `expectFailure: true` and optional `stderrContains`.
- `loadEvals` - new; reads `evals.json`, validates the top-level `evals` array, returns typed records. Locks the key (anti-pattern #4).
- `assertion` <- DT `tests/evals/shared.ts` lines 76-78.
- `summarize` <- DT `shared.ts` lines 98-107 plus `aggregateCondition` shape from `claude-skill-linear-editing/tests/evals/build_preview.ts` lines 390-410 (folded across runs, returns `{ passed, total, passRate }`).
- `parseDataIslandFromHtml` - new; regex-finds `<script id="<scriptId>" type="application/json">...</script>`, applies symmetric un-escape `</` for `<\/`, then `JSON.parse`. Replaces LE `grade.ts`'s regex-over-HTML chip counter.
- Types <- DT `shared.ts` lines 4-31.

Dead code NOT lifted: `SLOT_TOKENS`, `UNIT_DATA_ID_PATTERN`, `countTopLevelUnits`, `countSubunits`, `countDivs`, `extractDataIds`, `activatedAssertion`, `formatPythonRepr`.

## 5. API contracts

- `createBundleTests(options)` - reads bundle once at module top via `readFileSync`; side-effect is `describe`/`it` registration. `sizeLimit` defaults to 16_384; `dataScriptId` is required; `dataScriptType` defaults to `application/json`.
- `createRenderTests({ renderPath, payloads, snapshotDir? })` - spawns `python3 <renderPath>` per payload via `spawnSync` (`encoding: 'utf8'`). Asserts exit code, optionally snapshots stdout.
- `loadEvals<T>(path)` -> `Array<{ id: string } & T>`. Throws on missing file, invalid JSON, or top-level key other than `evals`.
- `assertion(text, passed, evidence?)` -> `Assertion`. Pure.
- `summarize(assertions)` -> `GradingSummary`. Pure, order-independent.
- `parseDataIslandFromHtml<T>(html, scriptId)` -> `T | null`. Pure. Returns null on missing tag or invalid JSON.

## 6. Test plan for the package itself

Meta-tests for `createBundleTests` use four mutated fixtures under `test/fixtures/bundles/`. Each feeds `createBundleTests`; the meta-test asserts only the expected `it` fails:
1. `missing-type-module.html` - `<script type="module">` rewritten to `<script>`.
2. `oversized.html` - padded past `sizeLimit`.
3. `missing-token.html` - `{{topic}}` stripped.
4. `missing-literal.html` - `sendPrompt` renamed.

`createRenderTests` meta-test uses Phase 4's canonical `render.py` plus one valid and one broken payload; asserts pass + fail cases route correctly.

`loadEvals`: valid file, missing file, invalid JSON, wrong top-level key (must throw naming `evals`).

`summarize`: feed an assertion array in multiple orderings, assert identical output.

`parseDataIslandFromHtml`: HTML with `<\/` in the JSON literal round-trips to `</` cleanly.

## 7. Subpath exports

Single `index.ts` re-exports all six functions + five types. Splitting into `@visill/test/bundle`, `/render`, `/evals` adds three `exports` map entries for marginal clarity. Defer the subpath split until a bundling reason demands it.

## 8. Success criteria

- Each of the four broken-bundle fixtures fails the corresponding `it` in `createBundleTests`, and only that `it`.
- `summarize` produces identical output across 100 random reorderings of the same assertion array.
- `parseDataIslandFromHtml` round-trips a payload containing the literal substring `</script>` without a false-positive split.
- `loadEvals` rejects an `evals.json` whose top-level key is `scenarios`, with an error message naming the expected key.
- DT's bundle test, re-expressed via `createBundleTests`, is byte-identical in `describe`/`it` titles to the lifted source, so DT migration is mechanical.

## 9. Commits within this phase

1. `feat(test): scaffold @visill/test package + types`
2. `feat(test): createBundleTests preset`
3. `feat(test): createRenderTests subprocess preset`
4. `feat(test): loadEvals + assertion + summarize + parseDataIslandFromHtml`
5. `test(test): meta-tests + broken-bundle fixtures`
6. `docs(adrs): 0013 + 0014`

## 10. Dependencies

Depends on:
- Phase 3 (`@visill/build`) - `createBundleTests` calls `resolveSkillName` to derive the bundle path default.
- Phase 4 (canonical `render.py`) - the render-test meta-test needs the canonical shape to test against.

Blocks Phase 6 (`create-visill` scaffolder) - the scaffolder template's `tests/widget/*.test.ts` and `tests/evals/*.ts` import from `@visill/test`.

## 11. Risks + mitigations

- `python3` on CI flaky or missing -> scaffolder's `build.yml` installs Python 3 via `setup-python`; the meta-test guards with a one-shot `python3 --version` check at module load to emit a clear signal rather than an opaque `ENOENT`.
- Vitest snapshot churn from `createRenderTests` -> snapshots live in consumer repos; document `pnpm test -- -u` and keep payloads small.
- `parseDataIslandFromHtml` regex falsely splits on a literal `</script>` substring -> covered by the un-escape symmetry test in section 6; rendered HTML always carries `<\/script>` because `render.py` neutralises it.

## 12. Open questions

- Is `assertion()` too thin (a 5-line constructor) to justify shipping? Ship it: the named import is a documentation surface and refactor anchor, and the cost is trivial.
- Should `createRenderTests` accept an alternate interpreter (e.g. `python3.12`) for CI variance? Defer until an environment forces it.

## 13. Delivery

Shipped 2026-05-27 via direct push to `main` on `jordanl17/visill`. Four commits land the phase: `8e74ae8` (feat: the six-export surface + four meta-tests + fixtures + ADRs 0014/0015 Accepted), `f69b9da` (docs: CLAUDE.md rule mandating extension-less TS imports, captured mid-phase), `fcf6ee2` (chore: `.prettierignore` adds the fixtures dir after a CI prettier-check failure on the deliberately-handcrafted bundle HTML), and `c29d546` (docs: Phase 6 PRD §3 enumerated with canonical ignore patterns, ADR 0018 renamed to cover lockfile + ignore policy). CI green on the final tip after one recovery round.

- Deliverables match PRD §3: six exports, five types, four broken-bundle fixtures, the render-fixture dir (render.py byte-identical to the create-visill template plus the vendored chevron tree plus a minimal schema/template/payloads), four meta-test files. ADRs 0014 + 0015 Accepted and indexed.
- 40 tests pass across the four meta files (28 bundle.test.ts sub-assertions + 5 evals + 5 data-island + 2 render). Workspace gates green pre- and post-simplifier: 23 visill + 18 visill-build + 40 visill-test = 81 tests; typecheck, lint, build all clean.
- The `createBundleTests` describe/it titles match the DT source byte-identically when called with DT's parameter values, satisfying PRD §8 success criterion 5 and making the Phase 8 migration mechanical.
- `createRenderTests` carries a module-load python3 probe so missing-interpreter environments fail fast with a clear message rather than producing an opaque ENOENT inside a test.
- The simplifier pass made one tightening (a no-op ternary in `bundle.test.ts` collapsed to a `!==` comparison) and left the rest of the diff intact.

## 14. Lessons learned

- **`.js` import suffixes are wrong for `moduleResolution: "Bundler"`.** Spotted mid-phase: the initial `src/index.ts` re-exports used `from './bundle.js'` (a NodeNext convention referring to the compiled output). It typechecks under Bundler resolution but produces inconsistent style against sibling packages, all of which omit the extension. Landed as a CLAUDE.md hard rule in commit `f69b9da` so the next phase's sub-agent prompts inherit it.
- **Prettier needs to know which HTML files are deliberately handcrafted.** The four broken-bundle fixtures fail prettier-check because their structure is load-bearing: missing-type-module.html's bare `<script>` followed by a comment (not a keyword) is what keeps the negative-pattern assertion in `noBareScript` clean. Reformatting them inverts the test's truth value. Fix: add `packages/visill-test/test/fixtures/` to `.prettierignore`. Caught by CI; one recovery round.
- **Canonical ignore patterns differ across the three existing skills only in trivial ways.** A side audit (prompted by the prettier failure) showed that all three skill repos converge on the same `.gitignore`, `.prettierignore`, and `.oxlintrc.json` patterns with tiny variations. Phase 6 PRD §3 now enumerates the canonical sets so the Phase 6 sub-agent lifts them verbatim. ADR 0018 was renamed from "Opinionated lockfile policy" to "Template-shipped lockfile and ignore policy" to cover both.
- **Strict TypeScript settings bite on regex captures.** `noUncheckedIndexedAccess` types `match[1]` as `string | undefined` even when the capture group is mandatory. Use `match[1] ?? ''` (or restructure to bind the capture before use). The runtime guarantee that group 1 is defined is invisible to the type checker.
- **`@types/node` is a per-package devDep, not a workspace-level inheritance.** `packages/visill` and `packages/visill-build` each carry their own entry. Adding a new package that imports `node:*` requires the same explicit dep; the workspace doesn't pull it in automatically. The first typecheck after dispatching Wave 1 caught this immediately.
- **Vitest defaults are still the floor.** No `it()` extended its timeout; the Python subprocess round-trip clocks at ~50ms per payload, leaving four orders of magnitude of headroom under the 5s default.
