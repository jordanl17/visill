# Brand tokens primitive

## What it is

A brand-token system - colour ramps, type scale, spacing - baked into the SDK or the default template.

## Why we considered it

A shared token set would give widgets a coherent look out of the box and shortcut the "what colour for primary?" decision every author hits.

## Why we rejected it

visill is a framework, not a design system. Templates may opt into CSS variables or Tailwind, but the SDK stays unopinionated on visual language. Baking tokens in would push a house style on every consumer and add surface we then have to version.

## Revisit if

A strong default emerges from real widget usage - several shipped widgets land on the same token shape and authors ask for a shared source.
