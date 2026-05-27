import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['template/**', 'template-dev/**', 'node_modules/**', 'dist/**'],
  },
})
