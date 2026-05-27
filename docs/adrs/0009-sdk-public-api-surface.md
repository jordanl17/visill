# ADR 0009 - SDK public API surface

- Status: Accepted
- Date: 2026-05-27

## Context

The `@visill/sdk` package is the widget-side runtime SDK. It replaces the helpers copy-pasted across three existing widget repos: `claude-targettable-feedback`, `claude-skill-decision-tree`, and `claude-skill-linear-editing`. Each repo carries the same handful of utilities for talking to the host, waiting on the DOM, querying elements, delegating events, reading inline JSON, and assembling prompt strings. Phase 2 lifts those utilities into one shared package.

The surface must stay small. A framework with thirty exports invites bloat and forks; a framework with three exports forces authors back into copy-paste. Seven exports cover every concrete pattern observed across the three source repos, and every one of them is motivated by code that already ships:

- `sendPrompt` - all three repos declare an identical `globalThis.sendPrompt` ambient and call it.
- `readyDOM` - decision-tree opens with a rationale comment about `DOMContentLoaded` and the inline data island; the other two repeat the pattern inline.
- `requireElement` - identical body in all three repos.
- `ownDescendant` - targettable-feedback uses an `.unit` scope check that generalises to any selector.
- `delegate` - linear-editing chains `event.target.closest(selector)` for click delegation; ad-hoc across the others.
- `readDataIsland` - all three parse `<script type="application/json">` content with the same shape.
- `buildPrompt` - linear-editing builds multi-section prompts by ad-hoc concatenation.

Locking the surface in an ADR stops drift. The `.d.ts` snapshot test (PRD 002 section 6) is the runtime gate; this ADR is the design gate. Future additions require a new ADR.

## Decision

The `@visill/sdk` package exports exactly the following seven names. Signatures are verbatim from `docs/design/visill-overview.md` "SDK API sketch".

1. `sendPrompt(text: string): void`. Re-exported from `src/host.ts`, which also ships the ambient `declare global { function sendPrompt(text: string): void }` augmentation that types `globalThis.sendPrompt` for consumers. This is the same shape the three source skill repos already use.
2. `readyDOM(init: () => void): void`.
3. `requireElement<ElementType extends Element = HTMLElement>(selector: string, root?: ParentNode): ElementType`.
4. `ownDescendant<ElementType extends Element = HTMLElement>(root: Element, selector: string): ElementType | undefined`.
5. `delegate<EventName extends keyof HTMLElementEventMap>(root: Element, selector: string, event: EventName, handler: (event: HTMLElementEventMap[EventName], target: Element) => void): () => void`.
6. `readDataIsland<DataShape>(scriptId: string): DataShape`.
7. `buildPrompt(sections: ReadonlyArray<string | null | undefined>): string`.

Locked behaviours, resolving the open questions in PRD 002 section 11:

- `buildPrompt` keeps empty strings. It filters only `null` and `undefined`. Authors emit deliberate blank-line separators by passing `""`.
- `requireElement` defaults `root` to `document`. The second argument is opt-in scoping.
- `readyDOM` may be called multiple times. Each call is independent; the SDK keeps no internal queue.
- `delegate`'s handler signature is `(event, matched)`. The `event.currentTarget` value stays untouched, matching native delegated-listener behaviour. The function returns an unsubscribe callback. Before invoking the handler, `delegate` confirms `root.contains(matched)`, which rules out matches found via `closest()` walking above `root`.

## Alternatives considered

- **A built-in state primitive.** Rejected. A signals-like or reducer-like container in the SDK forces an opinion the framework should not carry. See [rejected/state-primitive.md](../rejected/state-primitive.md).
- **Tagged prompt builders (`INCLUDED` / `UPDATE` / `DISCARDED`).** Deferred. The pattern surfaces only in targettable-feedback's editor flow. Extracting it now would lock a shape against a single example. Revisit when a fourth editor-style skill converges on the same tagging.
- **Default exports or a namespace export.** Rejected. Named exports tree-shake cleanly under Vite and Rollup; a default export or a `* as visill` namespace defeats per-export elimination and obscures the surface in IDE autocomplete.

## Consequences

- The package ships ESM-only with `sideEffects: false`. Bundlers drop unused exports without configuration.
- The `.d.ts` snapshot test in `packages/visill/src/public-api.test.ts` locks this surface. A rename, signature change, or new export fails the test until the snapshot is regenerated and the diff reviewed.
- Future additions require a new ADR before the snapshot moves.
- Importing `sendPrompt` brings the ambient `globalThis.sendPrompt` declaration along with it. The augmentation lives in `src/host.ts` and re-exports through `src/index.ts`; consumers that import any `@visill/sdk` symbol pick up the type. This is the one acknowledged side-effect of consuming the SDK, documented in `host.ts` and the package README.

## References

- [docs/design/visill-overview.md](../design/visill-overview.md) "SDK API sketch" (lines 184-215).
- [docs/prds/002-phase-2-visill-sdk.md](../prds/002-phase-2-visill-sdk.md).
- [docs/rejected/state-primitive.md](../rejected/state-primitive.md).
- Source widget repos: `claude-targettable-feedback`, `claude-skill-decision-tree`, `claude-skill-linear-editing` (lift sources per PRD 002 section 4).
