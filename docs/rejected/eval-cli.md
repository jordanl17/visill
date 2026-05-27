# Dedicated eval CLI

## What it is

A `visill eval` CLI that runs widget evaluations as a first-class command, separate from the test runner.

## Why we considered it

A dedicated CLI makes evals feel distinct from unit tests and gives room for eval-specific flags, reporters, and output formats.

## Why we rejected it

Two runners is one too many. Vitest already handles discovery, isolation, watch mode, and reporters; `@visill/test` rides on it for evals too. One mental model, one config surface, one place to learn. See ADR 0022 (forthcoming) in the [ADR index](../adrs/README.md).

## Revisit if

Vitest stops fitting eval workloads - for example, if we need long-running runs, cost accounting, or a result store that Vitest cannot host cleanly.
