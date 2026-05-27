import { readFileSync } from 'node:fs'

export interface Assertion {
  text: string
  passed: boolean
  evidence: string
}

export interface GradingSummary {
  passed: number
  failed: number
  total: number
  pass_rate: number
}

export interface Grading {
  expectations: Assertion[]
  summary: GradingSummary
}

export interface Meta {
  activated?: boolean | null
  reason?: string
}

export interface RunOutputs {
  widget: string
  response: string
  meta: Meta
}

export const assertion = (text: string, passed: boolean, evidence = ''): Assertion => ({
  text,
  passed,
  evidence,
})

export const summarize = (expectations: Assertion[]): GradingSummary => {
  const passedCount = expectations.filter((expectation) => expectation.passed).length
  const total = expectations.length
  return {
    passed: passedCount,
    failed: total - passedCount,
    total,
    pass_rate: total > 0 ? passedCount / total : 0,
  }
}

export const loadEvals = <T>(path: string): Array<{ id: string } & T> => {
  const raw = readEvalsFile(path)
  const parsed = parseEvalsJson(raw, path)
  const record = asPlainObject(parsed)
  const keys = Object.keys(record)
  const hasOnlyEvals = keys.length === 1 && keys[0] === 'evals'
  if (hasOnlyEvals && Array.isArray(record.evals)) {
    return record.evals as Array<{ id: string } & T>
  }
  const actualKey = keys[0] ?? ''
  throw new Error(`loadEvals: expected top-level key "evals" at ${path}; found "${actualKey}"`)
}

const asPlainObject = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) return {}
  if (value === null) return {}
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

const readEvalsFile = (path: string): string => {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'ENOENT') {
      throw new Error(`loadEvals: file not found at ${path}`)
    }
    throw error
  }
}

const parseEvalsJson = (raw: string, path: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch (error) {
    const originalMessage = (error as Error).message
    throw new Error(`loadEvals: invalid JSON at ${path}: ${originalMessage}`)
  }
}
