import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['template/**', 'template-dev/**', 'node_modules/**', 'dist/**'],
  },
})
