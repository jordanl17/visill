import { resolve } from 'node:path'
import type { UserConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { assembleSkill } from './assemble-skill'
import { finalizeBundle } from './finalize-bundle'
import { resolveSkillName } from './resolve-skill-name'

const baseDefaults: UserConfig = {
  base: './',
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

export async function defineVisillConfig(userConfig: UserConfig = {}): Promise<UserConfig> {
  const repoRoot = process.cwd()
  const skillName = await resolveSkillName(repoRoot)
  const skillDir = resolve(repoRoot, 'skill', skillName)
  const assetsDir = resolve(skillDir, 'assets')
  const skillSrcDir = resolve(repoRoot, 'skill-src')
  const widgetEntry = resolve(repoRoot, 'widget-src/widget.html')

  const defaultPlugins = [
    viteSingleFile({ removeViteModuleLoader: true }),
    finalizeBundle({ outDir: assetsDir }),
    assembleSkill({ skillDir, skillSrcDir }),
  ]

  const userBuild = userConfig.build ?? {}
  const userRollupOptions = userBuild.rollupOptions ?? {}

  return {
    ...baseDefaults,
    ...userConfig,
    root: userConfig.root ?? 'widget-src',
    plugins: [...defaultPlugins, ...(userConfig.plugins ?? [])],
    build: {
      ...baseDefaults.build,
      ...userBuild,
      outDir: userBuild.outDir ?? assetsDir,
      rollupOptions: {
        ...userRollupOptions,
        input: userRollupOptions.input ?? widgetEntry,
      },
    },
  }
}
