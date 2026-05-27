import { execSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  assertNoUnreplaced,
  substituteSentinels,
  toPascalCase,
  type SentinelValues,
} from './sentinels'

export const SKILL_NAME_PATTERN = /^[a-z][a-z0-9-]{1,38}$/

export const isValidSkillName = (name: string): boolean => SKILL_NAME_PATTERN.test(name)

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
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
  '.gitignore',
  '.prettierignore',
])

const EXTENSIONLESS_TEXT_FILES: ReadonlySet<string> = new Set([
  'LICENSE',
  'README',
  'CHANGELOG',
  'NOTICE',
])

const isTextFile = (filePath: string): boolean => {
  const extension = path.extname(filePath)
  if (extension.length > 0) {
    return TEXT_EXTENSIONS.has(extension)
  }
  return EXTENSIONLESS_TEXT_FILES.has(path.basename(filePath))
}

const readSkillName = async (argv: readonly string[]): Promise<string> => {
  const fromArgv = argv[2]
  if (typeof fromArgv === 'string' && fromArgv.length > 0) {
    return fromArgv
  }
  const readline = createInterface({ input: stdin, output: stdout })
  try {
    const answer = await readline.question('Skill name (kebab-case): ')
    return answer.trim()
  } finally {
    readline.close()
  }
}

const validateSkillName = (name: string): void => {
  if (isValidSkillName(name)) {
    return
  }
  throw new Error(
    `Invalid skill name "${name}". Must match ${SKILL_NAME_PATTERN} (lowercase, kebab-case, 2-39 chars, starts with a letter).`,
  )
}

export const detectPackageManager = (userAgent: string | undefined): string => {
  if (userAgent === undefined || userAgent.length === 0) {
    return 'pnpm'
  }
  const leadingToken = userAgent.split(' ')[0] ?? ''
  const managerName = leadingToken.split('/')[0] ?? ''
  const known: ReadonlySet<string> = new Set(['pnpm', 'npm', 'yarn', 'bun'])
  if (known.has(managerName)) {
    return managerName
  }
  return 'pnpm'
}

const tryGitConfig = (key: string): string => {
  try {
    const value = execSync(`git config ${key}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return value.toString('utf8').trim()
  } catch {
    return ''
  }
}

const readGitIdentity = (): string => {
  const userName = tryGitConfig('user.name')
  const userEmail = tryGitConfig('user.email')
  if (userName.length === 0 || userEmail.length === 0) {
    return ''
  }
  return `${userName} <${userEmail}>`
}

const toTitleCase = (kebab: string): string =>
  kebab
    .split('-')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ')

const buildSentinelValues = (skillName: string): SentinelValues => ({
  SKILL_NAME: skillName,
  SKILL_NAME_PASCAL: toPascalCase(skillName),
  SKILL_DESCRIPTION: 'A visill-powered skill.',
  SKILL_TITLE: toTitleCase(skillName),
  AUTHOR: readGitIdentity(),
  YEAR: String(new Date().getFullYear()),
})

const resolveTemplateDirectory = (): string => {
  const fromImportMeta = typeof import.meta.dirname === 'string' ? import.meta.dirname : undefined
  const baseDirectory = fromImportMeta ?? path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(baseDirectory, '../template')
}

const listEntries = (directory: string): readonly string[] => readdirSync(directory)

const ensureDirectory = (directory: string): void => {
  mkdirSync(directory, { recursive: true })
}

const copyTemplate = (
  sourceDirectory: string,
  targetDirectory: string,
  values: SentinelValues,
): void => {
  ensureDirectory(targetDirectory)
  listEntries(sourceDirectory).forEach((entryName) => {
    const sourcePath = path.join(sourceDirectory, entryName)
    const targetPath = path.join(targetDirectory, entryName)
    const entryStats = statSync(sourcePath)
    if (entryStats.isDirectory()) {
      copyTemplate(sourcePath, targetPath, values)
      return
    }
    if (isTextFile(sourcePath)) {
      const original = readFileSync(sourcePath, 'utf8')
      const rendered = substituteSentinels(original, values)
      writeFileSync(targetPath, rendered)
    } else {
      copyFileSync(sourcePath, targetPath)
    }
    chmodSync(targetPath, entryStats.mode)
  })
}

const walkFiles = (directory: string): readonly string[] =>
  listEntries(directory).flatMap((entryName) => {
    const entryPath = path.join(directory, entryName)
    if (statSync(entryPath).isDirectory()) {
      return walkFiles(entryPath)
    }
    return [entryPath]
  })

const verifyNoSentinelSurvivors = (targetDirectory: string): void => {
  walkFiles(targetDirectory)
    .filter(isTextFile)
    .forEach((filePath) => {
      const content = readFileSync(filePath, 'utf8')
      assertNoUnreplaced(content, filePath)
    })
}

const printPostScaffoldMessage = (skillName: string, packageManager: string): void => {
  const lines = [
    `Created ${skillName}/ via visill.`,
    'Next:',
    `  cd ${skillName}`,
    `  ${packageManager} install`,
    `  ${packageManager} build`,
    `  ${packageManager} test`,
  ]
  console.log(lines.join('\n'))
}

const main = async (): Promise<void> => {
  const skillName = await readSkillName(process.argv)
  validateSkillName(skillName)

  const targetDirectory = path.resolve(process.cwd(), skillName)
  if (existsSync(targetDirectory)) {
    throw new Error(`Target directory already exists: ${targetDirectory}`)
  }

  const templateDirectory = resolveTemplateDirectory()
  if (existsSync(templateDirectory)) {
    const values = buildSentinelValues(skillName)
    const packageManager = detectPackageManager(process.env.npm_config_user_agent)
    copyTemplate(templateDirectory, targetDirectory, values)
    verifyNoSentinelSurvivors(targetDirectory)
    printPostScaffoldMessage(skillName, packageManager)
    return
  }
  throw new Error(`Template directory not found: ${templateDirectory}`)
}

const isDirectInvocation = (): boolean => {
  const entry = process.argv[1]
  if (typeof entry !== 'string' || entry.length === 0) {
    return false
  }
  return import.meta.url === pathToFileURL(entry).href
}

if (isDirectInvocation()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
