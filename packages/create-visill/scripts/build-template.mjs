import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TARGET_PACKAGES = new Set(['@visill/sdk', '@visill/build', '@visill/test'])
const DEPENDENCY_KEYS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const templateDir = path.resolve(scriptDir, '..', 'template')
const mirrorDir = path.resolve(scriptDir, '..', 'template-dev')

if (existsSync(mirrorDir)) {
  rmSync(mirrorDir, { recursive: true, force: true })
}

cpSync(templateDir, mirrorDir, { recursive: true })

const manifestPath = path.join(mirrorDir, 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const rewriteDependencyGroup = (group) => {
  if (group === undefined) return undefined
  return Object.fromEntries(
    Object.entries(group).map(([name, version]) => [
      name,
      TARGET_PACKAGES.has(name) ? 'workspace:*' : version,
    ]),
  )
}

DEPENDENCY_KEYS.forEach((key) => {
  if (manifest[key] !== undefined) {
    manifest[key] = rewriteDependencyGroup(manifest[key])
  }
})

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

console.log('build-template: materialised template-dev/ with workspace:* overrides.')
