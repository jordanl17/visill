export type SentinelKey =
  | 'SKILL_NAME'
  | 'SKILL_NAME_PASCAL'
  | 'SKILL_DESCRIPTION'
  | 'SKILL_TITLE'
  | 'AUTHOR'
  | 'YEAR'

export type SentinelValues = Record<SentinelKey, string>

export const sentinelKeys: readonly SentinelKey[] = [
  'SKILL_NAME',
  'SKILL_NAME_PASCAL',
  'SKILL_DESCRIPTION',
  'SKILL_TITLE',
  'AUTHOR',
  'YEAR',
]

const SENTINEL_PATTERN = /<<([A-Z][A-Z0-9_]*)>>/g

const isSentinelKey = (key: string): key is SentinelKey => sentinelKeys.includes(key as SentinelKey)

export const substituteSentinels = (content: string, values: SentinelValues): string =>
  content.replace(SENTINEL_PATTERN, (match, key: string) => {
    if (isSentinelKey(key)) {
      return values[key]
    }
    return match
  })

export const assertNoUnreplaced = (content: string, filePath: string): void => {
  const survivors = Array.from(content.matchAll(SENTINEL_PATTERN), (match) => match[0])
  if (survivors.length > 0) {
    const unique = Array.from(new Set(survivors))
    throw new Error(`Unreplaced sentinel(s) in ${filePath}: ${unique.join(', ')}`)
  }
}

export const toPascalCase = (kebab: string): string =>
  kebab
    .split('-')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('')
