import { chmodSync, cpSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'

export interface AssembleSkillExtra {
  from: string
  to: string
  executable?: boolean
}

export interface AssembleSkillOptions {
  skillDir: string
  skillSrcDir: string
  slotToken?: string
  extras?: AssembleSkillExtra[]
}

function renderSchemaReference(schemaObject: unknown): string {
  const pretty = JSON.stringify(schemaObject, null, 2)
  return ['```json', pretty, '```'].join('\n')
}

export function assembleSkill(options: AssembleSkillOptions): Plugin {
  const { skillDir, skillSrcDir, extras } = options
  const slotToken = options.slotToken ?? '{{SCHEMA}}'
  return {
    name: 'visill:assemble-skill',
    enforce: 'post',
    writeBundle() {
      const schemaSourcePath = join(skillSrcDir, 'assets', 'schema.json')
      const schemaRaw = readFileSync(schemaSourcePath, 'utf8')
      const schemaObject = JSON.parse(schemaRaw) as unknown

      const skillMdSourcePath = join(skillSrcDir, 'SKILL.md')
      const skillMdSource = readFileSync(skillMdSourcePath, 'utf8')
      const schemaReference = renderSchemaReference(schemaObject)
      const skillMdFinal = skillMdSource.replace(slotToken, schemaReference)
      const skillMdTarget = join(skillDir, 'SKILL.md')
      writeFileSync(skillMdTarget, skillMdFinal, 'utf8')

      const schemaTargetPath = join(skillDir, 'assets', 'schema.json')
      writeFileSync(schemaTargetPath, schemaRaw, 'utf8')

      const scriptsSource = join(skillSrcDir, 'scripts')
      const scriptsTarget = join(skillDir, 'scripts')
      cpSync(scriptsSource, scriptsTarget, { recursive: true })

      const renderScript = join(scriptsTarget, 'render.py')
      chmodSync(renderScript, 0o755)

      const referencesSource = join(skillSrcDir, 'references')
      const referencesTarget = join(skillDir, 'references')
      cpSync(referencesSource, referencesTarget, { recursive: true })

      const licenseSource = resolve(skillSrcDir, '..', 'LICENSE')
      const licenseTarget = join(skillDir, 'LICENSE')
      writeFileSync(licenseTarget, readFileSync(licenseSource, 'utf8'), 'utf8')

      const hasExtras = extras !== undefined && extras.length > 0
      if (hasExtras) {
        extras.forEach((extra) => {
          const sourceStat = statSync(extra.from)
          if (sourceStat.isDirectory()) {
            cpSync(extra.from, extra.to, { recursive: true })
          } else {
            mkdirSync(dirname(extra.to), { recursive: true })
            writeFileSync(extra.to, readFileSync(extra.from))
          }
          if (extra.executable === true) {
            chmodSync(extra.to, 0o755)
          }
        })
      }

      const baseSummary = `assemble-skill: wrote ${skillMdTarget}, ${schemaTargetPath}, ${scriptsTarget}/, ${referencesTarget}/, ${licenseTarget}`
      const extrasSuffix = hasExtras ? ` + ${extras.length} extra(s)` : ''
      this.info(`${baseSummary}${extrasSuffix}`)
    },
  }
}
