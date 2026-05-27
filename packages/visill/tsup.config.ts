import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node22',
  bundle: true,
  clean: true,
  sourcemap: true,
  dts: true,
  splitting: false,
  treeshake: true,
})
