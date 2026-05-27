import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Assertion, loadEvals, summarize } from '../src/evals'

describe('loadEvals', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'evals-test-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it('returns the evals array for a valid file', () => {
    const filePath = join(workDir, 'valid.json')
    writeFileSync(filePath, '{"evals":[{"id":"a","score":1},{"id":"b","score":2}]}', 'utf8')
    const result = loadEvals<{ score: number }>(filePath)
    expect(result).toEqual([
      { id: 'a', score: 1 },
      { id: 'b', score: 2 },
    ])
  })

  it('throws an Error whose message contains the path when the file is missing', () => {
    const missingPath = join(workDir, 'does-not-exist.json')
    expect(() => loadEvals(missingPath)).toThrow(new RegExp(escapeRegex(missingPath)))
    expect(() => loadEvals(missingPath)).toThrow(/file not found/)
  })

  it('throws an Error whose message contains "invalid JSON" when JSON is malformed', () => {
    const filePath = join(workDir, 'invalid.json')
    writeFileSync(filePath, '{not json', 'utf8')
    expect(() => loadEvals(filePath)).toThrow(/invalid JSON/)
  })

  it('throws an Error naming "evals" when the top-level key is something else', () => {
    const filePath = join(workDir, 'wrong-key.json')
    writeFileSync(filePath, '{"scenarios":[]}', 'utf8')
    expect(() => loadEvals(filePath)).toThrow(/"evals"/)
  })
})

describe('summarize', () => {
  it('produces the same summary regardless of input order', () => {
    const baseAssertions: Assertion[] = [
      { text: 'first', passed: true, evidence: 'e1' },
      { text: 'second', passed: false, evidence: 'e2' },
      { text: 'third', passed: true, evidence: 'e3' },
      { text: 'fourth', passed: true, evidence: 'e4' },
      { text: 'fifth', passed: false, evidence: 'e5' },
      { text: 'sixth', passed: true, evidence: 'e6' },
      { text: 'seventh', passed: false, evidence: 'e7' },
      { text: 'eighth', passed: true, evidence: 'e8' },
      { text: 'ninth', passed: true, evidence: 'e9' },
      { text: 'tenth', passed: false, evidence: 'e10' },
      { text: 'eleventh', passed: true, evidence: 'e11' },
      { text: 'twelfth', passed: false, evidence: 'e12' },
    ]
    const baseline = summarize(baseAssertions)
    const random = mulberry32(42)
    Array.from({ length: 100 }).forEach(() => {
      const shuffled = deterministicShuffle(baseAssertions, random)
      expect(summarize(shuffled)).toEqual(baseline)
    })
  })
})

const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const deterministicShuffle = <T>(input: readonly T[], random: () => number): T[] => {
  const indices = Array.from({ length: input.length }, (_unused, index) => index).reverse()
  return indices.reduce<T[]>((accumulator, currentIndex) => {
    if (currentIndex === 0) return accumulator
    const swapIndex = Math.floor(random() * (currentIndex + 1))
    const temp = accumulator[currentIndex]
    accumulator[currentIndex] = accumulator[swapIndex]
    accumulator[swapIndex] = temp
    return accumulator
  }, input.slice())
}
