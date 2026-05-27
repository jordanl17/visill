# Schema-driven form generation

## What it is

Derive widget forms from JSON Schema in the default template, so authors declare a schema and get inputs, validation, and submission wiring for free.

## Why we considered it

Form generation removes boilerplate for data-entry widgets and offers a clean declarative path from shape to UI.

## Why we rejected it

The template targets visual widgets - charts, layouts, interactive views - not data-entry forms. Schema-to-form code in the canonical template bloats the path that matters most and pulls the template toward a use case it is not for.

## Revisit if

A separate template flavour for form-style widgets becomes warranted, with its own scaffold entry in `create-visill`.
