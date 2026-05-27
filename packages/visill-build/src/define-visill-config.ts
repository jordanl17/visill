import { defineConfig, type UserConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const defaults: UserConfig = {
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  css: { transformer: 'lightningcss' },
  build: {
    emptyOutDir: false,
    modulePreload: false,
    minify: 'terser',
    cssMinify: 'lightningcss',
    terserOptions: {
      ecma: 2020,
      compress: { drop_console: true },
      mangle: { toplevel: false },
      format: { comments: false },
    },
  },
}

export function defineVisillConfig(userConfig: UserConfig = {}): UserConfig {
  const merged: UserConfig = {
    ...defaults,
    ...userConfig,
    plugins: [...(defaults.plugins ?? []), ...(userConfig.plugins ?? [])],
    build: { ...defaults.build, ...userConfig.build },
  }
  return defineConfig(merged) as UserConfig
}
