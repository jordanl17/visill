/**
 * Programmatic graders for the hello-world eval suite.
 *
 * Each scenario id in evals.json maps to a grader. Each grader returns
 * Assertion[] - one entry per objectively-verifiable check. The CLI
 * iterates per-condition runs and writes grading.json.
 *
 * Universal assertions (apply to every scenario):
 *   - meta.activated matches expected_activation
 *   - if activated: no leaked {{TOKEN}} in widget.html
 *   - if activated: the inline #root-data data island parses and carries
 *     a non-empty `name` string
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Assertion, Grading, RunOutputs } from './shared'
import { activatedAssertion, assertion, loadOutputs, summarize } from './shared'

const EVALS_JSON_PATH = resolve(__dirname, 'evals.json')

interface EvalEntry {
  id: string
  prompt: string
}

interface EvalsConfig {
  evals: EvalEntry[]
}

const noLeakedTokens = (outputs: RunOutputs): Assertion => {
  const widget = outputs.widget
  const tokens = widget.match(/\{\{+[^}]+\}\}+/g) ?? []
  return assertion(
    'no_leaked_tokens: rendered widget has no remaining {{...}} placeholders',
    tokens.length === 0,
    tokens.length ? `leaked: ${tokens.slice(0, 3).join(', ')}` : 'clean',
  )
}

interface RootData {
  name?: unknown
}

const extractRootData = (widget: string): RootData | null => {
  const match = widget.match(
    /<script\s+id="root-data"\s+type="application\/json">([\s\S]*?)<\/script>/,
  )
  if (match) {
    try {
      return JSON.parse(match[1] ?? '') as RootData
    } catch {
      return null
    }
  }
  return null
}

const namePresent = (outputs: RunOutputs): Assertion => {
  const payload = extractRootData(outputs.widget)
  const name = payload?.name
  const passed = typeof name === 'string' && name.length > 0
  return assertion(
    'name_present: #root-data parses and carries a non-empty name string',
    passed,
    passed ? `name: ${JSON.stringify(name)}` : 'missing or empty',
  )
}

const gradeFireScenario = (runDir: string, isBaseline: boolean): Assertion[] => {
  const outputs = loadOutputs(runDir)
  if (isBaseline) {
    return [activatedAssertion(outputs.meta, false, 'baseline_did_not_activate')]
  }
  return [
    activatedAssertion(outputs.meta, true, 'activated_meta_true: meta.activated=true'),
    noLeakedTokens(outputs),
    namePresent(outputs),
  ]
}

const gradeSkipScenario = (runDir: string, isBaseline: boolean): Assertion[] => {
  const outputs = loadOutputs(runDir)
  if (isBaseline) {
    return [activatedAssertion(outputs.meta, false, 'baseline_did_not_activate')]
  }
  const widget = outputs.widget
  return [
    activatedAssertion(outputs.meta, false, 'skipped_meta_false: meta.activated=false'),
    assertion(
      'no_widget_for_skip: skipped scenarios should not produce widget HTML',
      widget.trim().length === 0,
      widget.trim().length ? `widget has ${widget.length} bytes` : 'empty',
    ),
  ]
}

const loadGraderMap = (): Record<string, (runDir: string, isBaseline: boolean) => Assertion[]> => {
  const config = JSON.parse(readFileSync(EVALS_JSON_PATH, 'utf8')) as EvalsConfig
  return Object.fromEntries(
    config.evals.map((entry) => [
      entry.id,
      entry.id.startsWith('fire') ? gradeFireScenario : gradeSkipScenario,
    ]),
  )
}

const isDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory()

const gradeOneRun = (
  scenarioId: string,
  condition: 'with_skill' | 'without_skill',
  runDir: string,
  graders: Record<string, (runDir: string, isBaseline: boolean) => Assertion[]>,
): Grading | null => {
  const grader = graders[scenarioId]
  if (grader) {
    const expectations = grader(runDir, condition === 'without_skill')
    return { expectations, summary: summarize(expectations) }
  }
  console.warn(`[grade] no grader for scenario ${scenarioId}`)
  return null
}

const hasRunOutputs = (runDir: string): boolean => {
  const outputsDir = join(runDir, 'outputs')
  if (isDirectory(outputsDir)) {
    return existsSync(join(outputsDir, 'meta.json')) || existsSync(join(outputsDir, 'response.md'))
  }
  return false
}

const gradeIteration = (iterationDir: string): void => {
  const absolute = resolve(iterationDir)
  const graders = loadGraderMap()
  const evalDirs = readdirSync(absolute)
    .filter((name) => name.startsWith('eval-'))
    .filter((name) => isDirectory(join(absolute, name)))

  const lines = evalDirs.flatMap((dirName) => {
    const scenarioId = dirName.replace(/^eval-/, '')
    const evalDir = join(absolute, dirName)
    return (['with_skill', 'without_skill'] as const).flatMap((condition) => {
      const runDir = join(evalDir, condition, 'run-1')
      if (isDirectory(runDir)) {
        if (hasRunOutputs(runDir)) {
          const grading = gradeOneRun(scenarioId, condition, runDir, graders)
          if (grading) {
            writeFileSync(join(runDir, 'grading.json'), JSON.stringify(grading, null, 2))
            return [
              `${scenarioId.padEnd(32)} ${condition.padEnd(14)} ${grading.summary.passed}/${grading.summary.total} passed (${Math.round(grading.summary.pass_rate * 100)}%)`,
            ]
          }
          return []
        }
        return [`${scenarioId.padEnd(32)} ${condition.padEnd(14)} (no outputs, skipped)`]
      }
      return []
    })
  })

  console.log(lines.join('\n'))
}

const main = (): void => {
  const iterationDir = process.argv[2]
  if (iterationDir) {
    gradeIteration(iterationDir)
    return
  }
  console.error('Usage: pnpm tsx test/evals/grade.ts <iteration-dir>')
  process.exit(1)
}

main()
