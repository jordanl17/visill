import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const prefixes = ['visill-', 'claude-skill-']

function stripPrefix(name: string): string {
  const matched = prefixes.find((prefix) => name.startsWith(prefix))
  return matched ? name.slice(matched.length) : name
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

// Async because step 1 dynamic-imports visill.config.ts so the user's actual export is respected.
export async function resolveSkillName(repoRoot: string): Promise<string> {
  const configPath = join(repoRoot, 'visill.config.ts')
  if (existsSync(configPath)) {
    const configModule = await import(pathToFileURL(configPath).href)
    const namedExport = configModule.name
    if (isNonEmptyString(namedExport)) {
      return namedExport
    }
    const defaultName = configModule.default?.name
    if (isNonEmptyString(defaultName)) {
      return defaultName
    }
  }

  const packageJsonPath = join(repoRoot, 'package.json')
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const packageName = packageJson.name
    if (isNonEmptyString(packageName)) {
      return stripPrefix(packageName)
    }
  }

  throw new Error(`resolveSkillName: no visill.config.ts and no package.json#name at ${repoRoot}`)
}
