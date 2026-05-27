import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.html',
  '.css',
  '.txt',
  '.yml',
  '.yaml',
  '.sh',
  '.py',
])
const VENDOR_SKIP = '_vendor'
const WORKSPACE_MARKER = 'workspace:'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const templateDir = path.resolve(scriptDir, '..', 'template')

const walkFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    if (entry === VENDOR_SKIP) {
      return []
    }
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      return walkFiles(full)
    }
    return [full]
  })

const checkFile = (filePath) => {
  if (TEXT_EXTENSIONS.has(path.extname(filePath))) {
    const content = readFileSync(filePath, 'utf8')
    if (content.includes(WORKSPACE_MARKER)) {
      return `Found '${WORKSPACE_MARKER}' in ${path.relative(templateDir, filePath)}`
    }
    return null
  }
  return null
}

const violations = walkFiles(templateDir)
  .map(checkFile)
  .filter((violation) => violation !== null)

if (violations.length > 0) {
  console.error('prepublish-guard FAILED:')
  violations.forEach((violation) => console.error('  - ' + violation))
  process.exit(1)
}

console.log('prepublish-guard: no workspace: references in template/. OK.')
