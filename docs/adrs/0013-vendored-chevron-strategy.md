# ADR 0013: Vendored chevron strategy

- Status: Accepted
- Date: 2026-05-27

## Context

The canonical `render.py` uses Mustache to expand a bundled HTML template. The design doc forbids any `pip install` at host runtime: scaffolded skills run from a tarball against the stdlib alone.

Chevron 0.13.1 is the Mustache implementation both predecessor skills (`claude-skill-linear-editing`, `claude-skill-decision-tree`) already use. It is small (five Python source files), MIT-licensed, and proven against the exact templates visill renders.

The predecessor copies drifted. Linear-editing's `renderer.py` compares with `scope is 0`, which depends on CPython's small-int interning and lint-fails on newer interpreters. Decision-tree's `renderer.py` uses `scope == 0`, which is correct. Neither repo carried the upstream `LICENSE` next to the source.

Phase 4 lands one canonical copy under the scaffolder template. This ADR ratifies the strategy: which files, which variant of each, where they live, and how upgrades flow.

## Decision

Vendor chevron 0.13.1 verbatim under `packages/create-visill/template/skill-src/scripts/_vendor/chevron/`. Six files:

- `__init__.py` - package surface.
- `main.py` - CLI entry point (unused by visill but shipped for parity with upstream).
- `metadata.py` - pins `version = '0.13.1'`.
- `renderer.py` - decision-tree variant, with `scope == 0`. Linear-editing's `scope is 0` is not preserved.
- `tokenizer.py` - upstream verbatim.
- `LICENSE` - full upstream MIT permission notice, Noah Morrison copyright.

`render.py` prepends `_vendor` to `sys.path` before `import chevron`. No `pip install`, no system Python dependency beyond stdlib.

`__pycache__/` and `*.pyc` are gitignored at the scripts directory so byte-compiled artefacts never enter the template tree or a built `skill/` zip.

Upgrade flow: bump the vendored copy in this template, run Phase 5's `createRenderTests()` to confirm the five behavioural invariants still hold, ship via a `create-visill` minor release. Scaffolded skills do not auto-upgrade; each skill owns its rendered `render.py` and `_vendor/chevron/` after scaffold and lifts new files in by hand if it cares.

## Alternatives considered

- **`pip install chevron` at host runtime.** Rejected. Violates the design doc's zero-runtime-install rule and pushes a moving dependency on every skill author's host.
- **Vendor a different Mustache implementation (e.g. `pystache`).** Rejected. Chevron is smaller, faster on the small templates visill renders, and both existing skills already proved it out. Switching costs without benefit.
- **Ship chevron as a `python>=3.10` `requires` line in a manifest.** Rejected. There is no manifest in the design. Skills run from a tarball, not an installer; nothing reads a `requires` field.
- **Re-implement the Mustache subset visill actually uses.** Rejected. Chevron 0.13.1 is five source files. Reimplementing is more code than vendoring, less tested, and forces visill to own a Mustache parser.

## Consequences

- One canonical chevron 0.13.1 ships in every scaffolded skill. No drift across skills generated from the same `create-visill` version.
- Upstream chevron bug fixes do not reach existing scaffolds automatically. Authors who care upgrade by lifting new files into `_vendor/chevron/`.
- The DT `scope == 0` fix is the chosen baseline. LE's `is 0` bug is not preserved.
- License compliance is satisfied. The upstream MIT permission notice rides with the vendored copy under `LICENSE`.
- The chevron version is pinned in two places: `_vendor/chevron/metadata.py` and this ADR. Both stay in sync at upgrade time.

## References

- [PRD 004 §3 deliverables](../prds/004-phase-4-canonical-render-py.md#3-deliverables)
- [PRD 004 §7 chevron vendoring strategy](../prds/004-phase-4-canonical-render-py.md#7-chevron-vendoring-strategy)
- [PRD 004 §5 invariant 5](../prds/004-phase-4-canonical-render-py.md#5-behavioural-contract-invariants) - chevron renders the bundled template.
- Upstream chevron 0.13.1: https://github.com/noahmorrison/chevron/tree/0.13.1
- Implementation: `packages/create-visill/template/skill-src/scripts/_vendor/chevron/`.
