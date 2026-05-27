# @visill/build

## 0.1.0-rc.1

### Patch Changes

- be74af0: Rename visill to @visill/sdk to clear npm name similarity rejection vs vision. SDK now lives under the @visill org. Imports change from 'visill' to '@visill/sdk'.

## 0.1.0-rc.0

### Minor Changes

- 702eeb0: Initial RC release.
- 7012a3e: Initial release of @visill/build. Two Vite plugins (finalizeBundle, assembleSkill), one config wrapper (defineVisillConfig), and one async resolver (resolveSkillName). Lifts the duplicated bundle-finalisation and skill-assembly pipeline from claude-skill-decision-tree and claude-skill-linear-editing into one shared module. ESM-only. Peer-deps on vite, vite-plugin-singlefile, lightningcss, and terser. Default delivery to `widget-bundled.html` in `skill/<name>/assets/`. Skill-name resolution precedence and HTML rewrite rationale locked in ADR 0010 and ADR 0011.
