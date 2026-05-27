import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const prefixes = ['visill-', 'claude-skill-']

function stripPrefix(name: string): string {
  const matched = prefixes.find((prefix) => name.startsWith(prefix))
  return matched ? name.slice(matched.length) : name
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export async function resolveSkillName(repoRoot: string): Promise<string> {
  const packageJsonPath = join(repoRoot, 'package.json')
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const packageName = packageJson.name
    if (isNonEmptyString(packageName)) {
      return stripPrefix(packageName)
    }
  }

  throw new Error(`resolveSkillName: no package.json#name at ${repoRoot}`)
}
