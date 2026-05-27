# ADR 0014: Bundle-test preset shape

- Status: Accepted
- Date: 2026-05-27

## Context

Three skill repos - `claude-skill-decision-tree`, `claude-skill-linear-editing`, and `claude-targettable-feedback` - each ship a bundle-integrity test that checks the same invariants: the inlined `<script>` declares `type="module"`, runtime mustache tokens survive minification, critical string literals survive minification, the data-island `<script>` carries the expected `id` and `type`, and the bundle stays under a size budget. The assertion shapes are identical across the three repos; only the parameter values differ (token names, literal sets, data-island `id`, size ceiling).

Copy-paste maintenance is the failure mode. A bug fix or new invariant lands in one repo and drifts in the others. Phase 5 ships `@visill/test` to lift these checks behind a single helper. `createBundleTests` is the bundle-side slot. This ADR locks its shape so the DT migration in Phase 8 reduces to passing DT's existing constants as parameters.

## Decision

`createBundleTests(options: BundleTestOptions)` registers Vitest `describe`/`it` groups by side effect. It accepts seven parameters:

| Parameter | Required | Default | Purpose |
|---|---|---|---|
| `bundlePath` | yes | - | Absolute path to the built bundle HTML. |
| `skillName` | no | - | Descriptor used in failure messages and skill identification. |
| `doubleStacheTokens` | no | `[]` | Tokens asserted as `{{token}}` literals in the bundle. |
| `tripleStacheTokens` | no | `[]` | Tokens asserted as `{{{token}}}` literals in the bundle. |
| `literals` | no | `[]` | Critical string literals that must survive minification. |
| `dataScriptId` | yes | - | `id` attribute of the data-island `<script>` tag. |
| `dataScriptType` | no | `'application/json'` | `type` attribute of the data-island `<script>` tag. |
| `sizeLimit` | no | `16384` | Byte ceiling for the bundle. |

The function reads the bundle once via `readFileSync` at call time, then registers a top-level `describe('bundle integrity', ...)` containing four nested groups: script-execution timing, runtime slot tokens preserved, critical string literals survive JS minification, and size budget.

`describe`/`it` titles are byte-identical to the decision-tree source titles when parameters resolve to DT's values. Title parity makes DT migration mechanical: re-expressing the existing test via the preset produces the same titles, so snapshots and CI history remain meaningful across the swap.

The size budget default of 16,384 bytes (16 KB) reflects the empirical headroom for a hello-world bundle plus a few features. Skills override `sizeLimit` when they outgrow it.

## Alternatives considered

- **Each skill keeps its own copy-pasted bundle test.** Rejected. Drift between repos is the failure mode the preset prevents, and it is already visible in the three lift sources.
- **A single rigid test with no parameters.** Rejected. Skills legitimately differ in token names, data-island `id`, and literal set. A rigid test forces every skill onto one taxonomy or fails to cover real invariants.
- **Subpath exports per preset (`@visill/test/bundle`, `/render`, `/evals`).** Deferred. Three `exports` map entries for marginal clarity gain. Revisit when a bundling reason demands the split (PRD 005 §7).
- **Programmatic Vitest runner API instead of `describe`/`it` registration.** Rejected. Vitest's stable public surface is the global `describe`/`it` functions. A runner-API approach forks with each Vitest release.

## Consequences

- DT migration is mechanical: pass DT's hardcoded values as parameters; titles match byte-for-byte; snapshot history carries over.
- The 16 KB default `sizeLimit` may need revisiting as widgets grow past hello-world plus moderate features. The override path is a single `sizeLimit` parameter; document it in the package README and the scaffolded template.
- `describe`/`it` title byte-identity with DT is a load-bearing property. Changes to the preset's title strings need cross-checking against any migrated skill, because snapshot keys derive from titles.
- Skill consumers depend on Vitest as a peer. The preset registers via top-level `describe`/`it` calls; no programmatic test-runner API is involved, so consumers control their Vitest version.
- `bundlePath` is required and read synchronously at call time. Callers that need lazy bundle resolution (e.g. CI matrix across multiple builds) call `createBundleTests` per bundle rather than passing a deferred path.

## References

- [PRD 005 §3 Deliverables](../prds/005-phase-5-visill-test.md#3-deliverables)
- [PRD 005 §5 API contracts](../prds/005-phase-5-visill-test.md#5-api-contracts)
- [PRD 005 §8 Success criteria](../prds/005-phase-5-visill-test.md#8-success-criteria)
- [ADR 0009](./0009-sdk-public-api-surface.md) - companion shape decision for the SDK surface.
- Lift source: `claude-skill-decision-tree/tests/widget/bundle.test.ts` lines 26-98.
- Implementation: `packages/visill-test/src/bundle.ts`.
