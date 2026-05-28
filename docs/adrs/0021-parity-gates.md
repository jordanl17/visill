# ADR 0021: Parity gates for migration PRs

- Status: Accepted
- Date: 2026-05-28

## Context

A migration PR rewires a skill's build pipeline from ad-hoc helpers to visill packages. The intent is "same skill, different scaffolding": the published zip should change as little as possible, and any change that does land should be in the one file the migration touches by design (`widget-bundled.html`).

Without mechanical guarantees, a reviewer is asked to byte-diff zips themselves to confirm that intent. That work is tedious, error-prone, and abandoned in practice. Reviewers fall back to "looks right" and miss regressions buried in the bundle.

Five parity gates codify the comparisons a reviewer cares about: file-list equality, byte-equality where build determinism allows, structural HTML equality where it does not, gzipped size budget on the one bundle that may change, and eval grading stability over checked-in transcripts. Each migration branch carries `scripts/parity-check.sh`. CI invokes it on every push and PR; the script writes `parity-report.json` as a workflow artefact for review. The gates exist to free the reviewer for the diff that matters - the rewire itself.

## Decision

Each migration branch ships `scripts/parity-check.sh` with the following five gates, run in order against the migration zip and the prior `main` zip.

1. **Zip file-list and mode bits.** `unzip -Z1` over both zips; `diff` must be empty. `unzip -Z` confirms `render.py` ships with mode `-rwxr-xr-x` in both. Use `unzip -Z`, not `unzip -lv` - the latter omits mode bits on Linux GNU Info-ZIP.
2. **Per-file byte-equal except `widget-bundled.html`.** `diff -r` between the extracted trees. Only `widget-bundled.html` may differ. Every other file must be byte-identical.
3. **Structural HTML diff.** `node node_modules/@visill/test/scripts/structural-html-diff.mjs` parses both `widget-bundled.html` files and compares three regions: the first `<script type="module">` body, the inlined `<style>` blob, and the `<script id="..." type="application/json">` skeleton (id plus sorted top-level keys, not values). Whitespace and attribute order are normalised first.
4. **Gzipped bundle size delta within ±5%.** `gzip -c widget-bundled.html | wc -c` on both; `|delta| / max(size_a, size_b) <= 0.05`.
5. **Eval grading re-run.** `pnpm grade --transcripts tests/evals/transcripts/` re-runs `grade.ts` over checked-in transcripts (no agent re-runs). Assertion outcomes must match 1:1 between branches.

CI fails on any single fail. The script continues through every gate so the report is complete, then exits non-zero if any gate failed. `parity-report.json` uploads as a workflow artefact on every run, pass or fail. `skipped` is a valid per-gate state and does not count as fail (see Deferral below).

## Deferral: gate 5 transcripts

As of Phase 8, the DT canary does not ship checked-in transcripts at `tests/evals/transcripts/`. [ADR 0022](./0022-evals-local-only.md) keeps eval runs local-only to control cost and avoid non-deterministic CI signal; the transcript snapshot that gate 5 needs is a replayable artefact distinct from a live eval run, but no consumer has committed one yet.

Gate 5 therefore records `skipped` in the parity report until each consumer commits a transcript snapshot suitable for replay. Once any consumer ships transcripts, gate 5 flips for that consumer from `skipped` to live. A follow-up phase commits the canonical transcript set for each consumer and removes the `skipped` exit. Until then, gate 5 is documented but not enforced.

## Alternatives considered

- **Visual diff only.** Render both bundles in a headless browser and screenshot-compare. Rejected: brittle against font rendering and system locale, and misses behaviour regressions inside the module script that never surface visually. Structural diff is faster and more precise.
- **Byte-for-byte across all files including `widget-bundled.html`.** Reject any delta. Rejected: terser version drift, lightningcss minor bumps, and Vite chunk hash changes mean every routine SDK upgrade triggers a false positive. The ±5% size budget plus structural diff captures intent without false alarms.
- **Skip parity entirely; trust review.** Rejected: a reviewer cannot byte-diff a 7KB minified bundle by eye. Parity gates exist so the reviewer can trust the mechanical guarantees and focus on the rewire diff.

## Consequences

- Each migration branch carries a self-contained `scripts/parity-check.sh` that runs against any two zips, local or CI. Local invocation matches CI exactly.
- Gate 4's ±5% accommodates terser and lightningcss version drift. Tighter than 5% would create false alarms on routine SDK upgrades; looser would mask real bloat.
- Gate 5's `skipped` state is a known soft spot. Once transcripts ship, the gate becomes load-bearing and the deferral closes. Until then, gate 5 documents the intent without enforcing it, and the parity check passes on four gates plus one skip.
- The structural-html-diff CLI lives in `@visill/test` and ships in the package's `bin` and `files` fields. Consumers invoke it via the `node_modules` path or the `npx visill-structural-html-diff` shim; no PATH dependency.

## References

- [PRD 007 §6](../prds/007-phase-7-10-release-and-migration.md#6-parity-gate-specification) - parity gate specification.
- [ADR 0019](./0019-rc-publish-via-changesets-prereleases.md) - the RC train these gates verify.
- [ADR 0020](./0020-migration-branch-strategy.md) - the migration-branch model that hosts these gates.
- [ADR 0022](./0022-evals-local-only.md) - the eval-cost policy gate 5 must respect.
