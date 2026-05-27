# Parcel as the bundler

## What it is

Use Parcel instead of Vite to bundle widget output into a single inlined HTML artifact.

## Why we considered it

Parcel's zero-config posture promises less plumbing for a small framework. Its built-in HTML entry handling looked like a natural fit for single-file widget output.

## Why we rejected it

Vite's ecosystem fits tighter: `vite-plugin-singlefile` and mature HTML transforms cover the inlining path we need. Parcel's zero-config win shrinks once we have to author custom plugins anyway, and Vite's plugin API is the better surface for the `finalizeBundle` and `assembleSkill` work in `@visill/build`. See [ADR 0001](../adrs/0001-bundler-vite.md).

## Revisit if

Vite's single-file inlining path regresses or its plugin API breaks for our use case, and Parcel ships a comparable single-HTML output story.
