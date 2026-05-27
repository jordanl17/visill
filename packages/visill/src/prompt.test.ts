import { buildPrompt } from './prompt'

describe('buildPrompt', () => {
  test('filters out null and undefined entries', () => {
    expect(buildPrompt(['a', null, 'b', undefined, 'c'])).toBe('a\nb\nc')
  })

  test('preserves empty strings as deliberate blank-line separators', () => {
    expect(buildPrompt(['a', '', 'b'])).toBe('a\n\nb')
  })

  test('joins multiple sections with single newlines', () => {
    expect(buildPrompt(['one', 'two', 'three', 'four'])).toBe('one\ntwo\nthree\nfour')
  })

  test('returns empty string when every entry is null or undefined', () => {
    expect(buildPrompt([null, undefined])).toBe('')
  })
})
