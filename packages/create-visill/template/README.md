# <<SKILL_TITLE>>

<<SKILL_DESCRIPTION>>

## Install

```
<pm> install
```

## Build

```
<pm> build
```

Outputs `skill/<<SKILL_NAME>>.zip`.

## Test

```
<pm> test         # widget tests
<pm> test:evals   # evals, local only
```

Evals never run in CI. Run them on your machine before pushing.

## Layout

- `widget-src/` - widget entry, components, styles.
- `skill-src/` - SKILL.md and any supporting markdown.
- `tests/` - widget tests and eval fixtures.
- `visill.config.ts` - skill name, version, build options.

## Publish

Push to `main`. release-please opens a release PR. Merge it to cut a version and ship the zip.

## License

MIT
