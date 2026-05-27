import { describe, expect, it } from 'vitest'
import {
  assertNoUnreplaced,
  sentinelKeys,
  substituteSentinels,
  toPascalCase,
  type SentinelValues,
} from '../src/sentinels'
import { detectPackageManager, isValidSkillName } from '../src/index'

const sampleValues: SentinelValues = {
  SKILL_NAME: 'hello-world',
  SKILL_NAME_PASCAL: 'HelloWorld',
  SKILL_DESCRIPTION: 'A friendly greeter.',
  SKILL_TITLE: 'Hello World',
  AUTHOR: 'Ada Lovelace <ada@example.com>',
  YEAR: '2026',
}

describe('substituteSentinels', () => {
  it('substitutes every known sentinel key', () => {
    const template = sentinelKeys.map((key) => `${key}=<<${key}>>`).join('\n')
    const rendered = substituteSentinels(template, sampleValues)
    sentinelKeys.forEach((key) => {
      expect(rendered).toContain(`${key}=${sampleValues[key]}`)
    })
    expect(rendered).not.toMatch(/<<[A-Z][A-Z0-9_]*>>/)
  })

  it('replaces every occurrence when a key appears multiple times', () => {
    const template = '<<SKILL_NAME>> and again <<SKILL_NAME>> and once more <<SKILL_NAME>>'
    const rendered = substituteSentinels(template, sampleValues)
    expect(rendered).toBe('hello-world and again hello-world and once more hello-world')
  })

  it('leaves unknown sentinel tokens untouched', () => {
    const template = 'keep <<UNKNOWN_TOKEN>> but swap <<SKILL_NAME>>'
    const rendered = substituteSentinels(template, sampleValues)
    expect(rendered).toBe('keep <<UNKNOWN_TOKEN>> but swap hello-world')
  })

  it('returns content unchanged when no sentinels are present', () => {
    const template = 'plain text with no tokens at all'
    expect(substituteSentinels(template, sampleValues)).toBe(template)
  })
})

describe('assertNoUnreplaced', () => {
  it('throws when sentinel survivors remain, listing the file path and survivors', () => {
    const dirty = 'oops <<SKILL_NAME>> and <<UNKNOWN_TOKEN>>'
    expect(() => assertNoUnreplaced(dirty, '/tmp/example.md')).toThrowError(
      /Unreplaced sentinel\(s\) in \/tmp\/example\.md:.*<<SKILL_NAME>>.*<<UNKNOWN_TOKEN>>/,
    )
  })

  it('deduplicates repeated survivors in the error message', () => {
    const dirty = '<<SKILL_NAME>> <<SKILL_NAME>> <<SKILL_NAME>>'
    expect(() => assertNoUnreplaced(dirty, '/tmp/repeat.md')).toThrowError(
      /^Unreplaced sentinel\(s\) in \/tmp\/repeat\.md: <<SKILL_NAME>>$/,
    )
  })

  it('does not throw on clean content', () => {
    expect(() => assertNoUnreplaced('all clear', '/tmp/clean.md')).not.toThrow()
  })

  it('does not throw on empty content', () => {
    expect(() => assertNoUnreplaced('', '/tmp/empty.md')).not.toThrow()
  })
})

describe('toPascalCase', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['hello-world', 'HelloWorld'],
    ['hello', 'Hello'],
    ['hello-', 'Hello'],
    ['-hello', 'Hello'],
    ['', ''],
    ['hello-42', 'Hello42'],
    ['multi-word-skill-name', 'MultiWordSkillName'],
  ]

  cases.forEach(([input, expected]) => {
    it(`converts ${JSON.stringify(input)} to ${JSON.stringify(expected)}`, () => {
      expect(toPascalCase(input)).toBe(expected)
    })
  })
})

describe('isValidSkillName', () => {
  const validNames: readonly string[] = [
    'hello',
    'hello-world',
    'my-skill-2',
    'a1',
    'abcdefghij',
    'ab',
    'a' + 'b'.repeat(38),
  ]

  validNames.forEach((name) => {
    it(`accepts ${JSON.stringify(name)}`, () => {
      expect(isValidSkillName(name)).toBe(true)
    })
  })

  const invalidNames: ReadonlyArray<readonly [string, string]> = [
    ['', 'empty string'],
    ['a', 'single character (regex requires 1 leading letter + 1-38 more chars)'],
    ['Hello', 'uppercase leading letter'],
    ['helloWorld', 'uppercase inside the name'],
    ['1hello', 'leading digit'],
    ['-hello', 'leading dash'],
    ['a' + 'b'.repeat(39), 'length 40 (over the 39-char ceiling)'],
    ['hello.world', 'contains a dot'],
    ['hello world', 'contains a space'],
    ['hello_world', 'contains an underscore'],
  ]

  invalidNames.forEach(([name, reason]) => {
    it(`rejects ${JSON.stringify(name)} (${reason})`, () => {
      expect(isValidSkillName(name)).toBe(false)
    })
  })

  it('accepts a 39-char name (1 leading letter + 38 trailing chars)', () => {
    const maxLengthName = 'a' + 'b'.repeat(38)
    expect(maxLengthName.length).toBe(39)
    expect(isValidSkillName(maxLengthName)).toBe(true)
  })
})

describe('detectPackageManager', () => {
  const cases: ReadonlyArray<readonly [string | undefined, string]> = [
    ['pnpm/9.0.0 npm/?', 'pnpm'],
    ['npm/10.0.0 node/v20.0.0 linux x64', 'npm'],
    ['yarn/4.0.0', 'yarn'],
    ['bun/1.0.0', 'bun'],
    [undefined, 'pnpm'],
    ['', 'pnpm'],
    ['something-else/1.0', 'pnpm'],
  ]

  cases.forEach(([userAgent, expected]) => {
    it(`maps ${JSON.stringify(userAgent)} to ${JSON.stringify(expected)}`, () => {
      expect(detectPackageManager(userAgent)).toBe(expected)
    })
  })
})
