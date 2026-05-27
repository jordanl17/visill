export function buildPrompt(sections: ReadonlyArray<string | null | undefined>): string {
  return sections.filter((section): section is string => typeof section === 'string').join('\n')
}
