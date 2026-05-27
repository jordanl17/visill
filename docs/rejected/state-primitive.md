# Built-in state primitive in the SDK

## What it is

Ship a small state container in the `visill` package - signals-like or reducer-like - so every widget shares one state pattern.

## Why we considered it

A shared primitive would give widget authors a consistent mental model and remove a per-project decision. It would also let docs and examples speak one dialect.

## Why we rejected it

Too opinionated for a low-level framework. Authors reach for Preact, Solid, Zustand, or plain signals on their own; a built-in primitive becomes dead weight, or worse, fights what they bring. visill stays a thin runtime and lets the state choice live with the consumer.

## Revisit if

Multiple real widgets converge on the same state shape and we can extract a primitive from that usage rather than inventing one up front.
