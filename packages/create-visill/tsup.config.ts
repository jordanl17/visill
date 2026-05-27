import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
  bundle: true,
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
  sourcemap: false,
  dts: false,
  splitting: false,
  treeshake: true,
})
