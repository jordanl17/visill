# ADR 0017: Vendored example as integration gate

- Status: Accepted
- Date: 2026-05-27

## Context

visill ships four packages: the SDK (`@visill/sdk`), the Vite plugins (`@visill/build`), the test preset (`@visill/test`), and the scaffolder (`create-visill`). Each is unit-tested in isolation.

The real risks live at the seams: SDK API drift, plugin output drift, `render.py` contract drift, and release-zip layout drift. Unit tests inside one package cannot see a regression that only surfaces when all four cooperate to produce a real skill. A downstream consumer would surface those regressions, but waiting for users to discover them is unacceptable.

## Decision

Vendor a snapshot of upstream `claude-skill-decision-tree` as `examples/decision-tree/` in the visill monorepo. The example consumes `@visill/sdk`, `@visill/build`, and `@visill/test` via `workspace:*`. Any change to those packages either builds clean against the example or breaks the integration gate.

CI runs on every push:

1. `pnpm --filter=./examples/decision-tree build`
2. `pnpm --filter=./examples/decision-tree test`
3. Assert the produced `decision-tree.zip` weighs no more than the upstream baseline (`19499` bytes), pinned in `examples/decision-tree/.baseline-size`.

The example is `private: true`. It never publishes; it exists only as a canary.

## Alternatives considered

- **External-repo integration test.** Clone the real `claude-skill-decision-tree`, install visill into it via `pnpm.overrides`. Rejected: heavier CI setup, harder to diff when something breaks, and version churn from upstream changes unrelated to visill.
- **Snapshot of build outputs only.** Golden files for `widget-bundled.html` and the produced zip listing. Rejected: catches output shape drift but misses behaviour. A `render.py` contract change can produce a same-shaped but broken bundle.
- **Full publish dry-run via Verdaccio.** Publish locally, install from there. Rejected: same coverage as `workspace:*` installation with extra moving parts. Phase 7 adds a separate post-publish smoke against the real registry to catch the published-vs-workspace delta.

## Consequences

- Cheap, fast canary. Every push exercises all four packages end-to-end through one real-shaped skill.
- The baseline-size assertion catches inadvertent bundle bloat. The number must be updated alongside any intentional bundle-size change.
- Phase 8 migration of the three existing skill repos onto visill v0.1 is mechanically simplified: the vendored decision-tree shows the migration shape concretely.
- Drift between the vendored example and its upstream is acceptable. The vendored copy is a fixture, not a fork to maintain.

## References

- [PRD 006 §7 Vendored example setup](../prds/006-phase-6-create-visill-and-examples.md#7-vendored-example-setup)
- [PRD 006 §8 Test plan](../prds/006-phase-6-create-visill-and-examples.md#8-test-plan)
- [PRD 006 §9 Success criteria](../prds/006-phase-6-create-visill-and-examples.md#9-success-criteria)
- [ADR 0014](./0014-bundle-test-preset-shape.md) - bundle-test preset that the vendored example exercises.
- [ADR 0015](./0015-render-test-via-python-subprocess.md) - render test that the vendored example exercises.
- Phase 5 success criterion 5: bundle test `describe`/`it` titles match upstream byte-identically.
