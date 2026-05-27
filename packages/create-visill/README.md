# create-visill

Scaffold a new visill skill in one prompt.

## Usage

Pick your package manager. Pass a skill name, or omit it to be prompted:

```bash
npm create visill <name>
pnpm create visill <name>
yarn create visill <name>
bun create visill <name>
```

Bare form, prompts for the name:

```bash
npm create visill
```

The name must be lowercase, kebab-case, and 1-64 characters.

## What you get

A ready-to-build skill repo with:

- `widget-src/` - TypeScript widget entry wired to the visill SDK.
- `skill-src/` - canonical `render.py` plus vendored `chevron` for skill packaging.
- `tests/widget/` - vitest preset for bundle, render, and DOM helpers.
- `tests/evals/` - local-only eval harness (never runs in CI).
- `.github/workflows/` - typecheck, lint, test, and build on push and PR.
- `scripts/build-zip.sh` - assembles the publishable skill bundle.
- `LICENSE` - MIT.

## Next steps

After scaffolding, the CLI prints:

```
Next:
  cd <name>
  <pm> install
  <pm> build
  <pm> test
```

Where `<pm>` matches the package manager you invoked the scaffolder with.

## Links

- Framework repo: https://github.com/jordanl17/visill
