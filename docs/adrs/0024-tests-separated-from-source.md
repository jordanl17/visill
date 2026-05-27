# ADR 0024: Tests separated from source

- Status: Accepted
- Date: 2026-05-27

## Context

Three of the four workspace packages already separate tests from source: `visill-build`, `visill-test`, and `create-visill` each keep tests under a sibling directory (`test/` or `tests/`) and source under `src/`. `visill` is the outlier - eight test files sit alongside their subjects in `src/*.test.ts`.

The mixed convention causes friction. Tooling that targets sources (typecheck-only-public-API, lint rules scoped to runtime code, dts emission, bundler inputs) has to either trust filename heuristics or add explicit excludes per package. The `visill` package needed `noUncheckedIndexedAccess` exemptions and a bespoke build tsconfig to avoid emitting test types into the published dist. New contributors landing on `visill` first see a busier directory than the other three packages and infer the wrong convention.

The bare `test/` vs plural `tests/` split is its own micro-inconsistency. `visill-build` and `visill-test` use `test/`. `create-visill` was scaffolded with `tests/` in Phase 6 wave I.

## Decision

Every workspace package separates tests from source. Source lives under `src/`. Tests live under `test/` (singular). No `*.test.ts` files inside `src/`.

Test fixtures live under `test/fixtures/`. Tests that need to read source paths import them as regular extension-less relative paths from `test/` (e.g. `import { foo } from '../src/foo'`).

Build configs (tsup, tsconfig) target `src/` only. Test runners target `test/` only.

`visill`'s eight colocated tests must migrate to `test/` to come into compliance. `create-visill`'s `tests/` must rename to `test/`.

## Alternatives considered

- **Colocate everywhere.** Migrate the other three packages to `src/*.test.ts`. Rejected: makes published dist sensitive to test-only imports without explicit excludes, and three of four packages already separate.
- **Allow both, document the choice per package.** Rejected: encodes inconsistency. New packages would need to opt in to one convention; reviewers would have to remember which is which.
- **`tests/` (plural).** Rejected: two of three established packages use `test/`. Migrating two files to match one new file (create-visill) is the wrong direction.

## Consequences

- `visill`'s `src/*.test.ts` files migrate to `packages/visill/test/`. Imports under test rewrite to `../src/<name>`. Public API snapshot test (`public-api.test.ts`) keeps consuming the built `dist/index.d.ts`.
- `create-visill/tests/scaffolder.test.ts` migrates to `create-visill/test/`. Its `vitest.config.ts` `include` glob updates from `tests/**` to `test/**`.
- `tsconfig.json` and `tsup.config.ts` in each package can drop test-file exclusions; the dist build only sees `src/`.
- Future packages adopt this layout from the first commit.

## References

- Phase 6.1 PRD: [`docs/prds/006.1-phase-6.1-config-helpers-and-test-layout.md`](../prds/006.1-phase-6.1-config-helpers-and-test-layout.md).
- Pre-existing layout in `visill-build/test/`, `visill-test/test/`.
