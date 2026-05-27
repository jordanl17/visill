const REGEX_METACHARS = /[.*+?^${}()|[\]\\]/g

const escapeRegex = (value: string): string => value.replace(REGEX_METACHARS, '\\$&')

export const parseDataIslandFromHtml = <T>(html: string, scriptId: string): T | null => {
  const escapedId = escapeRegex(scriptId)
  const pattern = new RegExp(
    `<script\\s+id="${escapedId}"\\s+type="application/json">([\\s\\S]*?)</script>`,
  )
  const match = html.match(pattern)
  if (match === null) return null

  const captured = match[1] ?? ''
  // Mirror render.py's `</` -> `<\/` neutralisation (ADR 0012) so JSON literals
  // containing `</script>` round-trip cleanly through the data island.
  const inner = captured.replace(/<\\\//g, '</')

  try {
    return JSON.parse(inner) as T
  } catch {
    return null
  }
}
