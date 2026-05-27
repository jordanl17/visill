# Changesets

This folder holds [Changesets](https://github.com/changesets/changesets) for the visill monorepo. Each changeset is a markdown file describing a pending change to one or more packages, along with the intended semver bump (patch, minor, or major).

## Adding a changeset

Run the following from the repo root and answer the prompts:

```sh
pnpm changeset
```

The CLI writes a new markdown file in this folder. Commit it alongside your code change.

## Releasing

CI handles versioning and publishing. On merge to `main`, the Changesets GitHub Action either opens a release PR that consumes pending changesets and bumps versions, or publishes to npm if a release PR was just merged.

## Configuration

See `config.json` in this folder. Packages bump independently (no `linked` or `fixed` groups), so each package gets its own semver line.

## Docs

- [Intro to Changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
- [Common questions](https://github.com/changesets/changesets/blob/main/docs/common-questions.md)
- [Config options](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md)
