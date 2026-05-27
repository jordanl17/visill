# ADR 0023: tsup for ESM dist emission

- Status: Accepted
- Date: 2026-05-27

## Context

Workspace packages emit ESM to `dist/`. Source uses `moduleResolution: "Bundler"` per CLAUDE.md, so relative imports are extension-less (e.g. `from './foo'`).

Until Phase 6, builds ran `tsc -p tsconfig.json`. tsc passes extension-less imports through unchanged. Node ESM at runtime requires explicit `.js` extensions, or a `package.json` `exports` map that resolves them, so tsc's output is consumable by bundlers (Vite, esbuild via the bundler's resolver) but not by Node's native ESM resolver.

Phase 6's vendored-example integration gate (ADR 0017) loaded `@visill/build` from `examples/decision-tree/vite.config.ts`. Vite externalizes its config-time deps and lets Node resolve them. Node hit `dist/index.js`'s `import './finalize-bundle'` and failed with `ERR_MODULE_NOT_FOUND`.

This is a latent bug across all three plain-tsc packages (`visill`, `@visill/build`, `@visill/test`). It only surfaces when a Node ESM consumer loads the package directly.

## Decision

Replace `tsc` with `tsup` for `visill`, `@visill/build`, and `@visill/test`. Each ships a single bundled `dist/index.js` plus `dist/index.d.ts` from tsup's built-in dts emission.

`create-visill` already uses tsup (Phase 6 wave A). All four workspace packages now share the build tool.

Peer dependencies stay external: vite, terser, lightningcss, and vite-plugin-singlefile for `@visill/build`; vitest for `@visill/test`. tsup auto-externalizes `node:*` builtins.

## Alternatives considered

- **Postbuild script to append `.js` extensions** (e.g. tsc-alias or a 20-line Node walker). Rejected because it keeps two build paths in the workspace and requires every consumer of the source tree (snapshot tests, type-check tooling) to understand the rewrite step. Bundling is simpler.
- **Source-level `.js` extensions** (write `from './foo.js'` in `.ts` files, NodeNext convention). Rejected because it violates the workspace's extension-less imports rule (CLAUDE.md) and produces inconsistent style across editor and runtime contexts.
- **Stay on tsc, document the limitation, tell consumers to use a bundler-aware loader.** Rejected because published packages must Just Work for downstream consumers, not require a specific loader.

## Consequences

- All four workspace packages build via tsup with similar configs.
- `dist/` is a single bundled file per package; internal source structure is opaque to consumers.
- Peer deps stay external, so vite and vitest cannot get inlined into our dist.
- The integration gate (ADR 0017) caught the original bug. Documented here so future build-tool changes know what to verify.
- Phase 7 publish stays clean. Published tarballs are smaller (single bundled file vs many emitted files) and Node-ESM-resolvable.

## References

- [ADR 0017](./0017-vendored-example-integration-gate.md) - vendored example as integration gate, the canary that surfaced this.
- CLAUDE.md - TypeScript imports are extension-less hard rule, the source-side invariant.
- [PRD 003](../prds/003-phase-3-visill-build.md) and [PRD 005](../prds/005-phase-5-visill-test.md) - the original tsc build setup this replaces.
