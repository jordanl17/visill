import { describe, it, expect } from 'vitest'
import { parseDataIslandFromHtml } from '../src/data-island'

describe('parseDataIslandFromHtml', () => {
  it('parses a basic JSON island', () => {
    const html = '<script id="x" type="application/json">{"a":1}</script>'
    const parsed = parseDataIslandFromHtml<{ a: number }>(html, 'x')
    expect(parsed).toEqual({ a: 1 })
  })

  it('returns null when no matching tag exists', () => {
    const html = '<div>no island here</div>'
    const result = parseDataIslandFromHtml(html, 'missing')
    expect(result).toBeNull()
  })

  it('returns null when the inner JSON is malformed', () => {
    const html = '<script id="x" type="application/json">{not json</script>'
    const result = parseDataIslandFromHtml(html, 'x')
    expect(result).toBeNull()
  })

  it('round-trips a payload containing a literal </script> substring', () => {
    // The HTML carries `<\/script>` (render.py's ADR 0012 neutralisation of `</`).
    // The parsed JS value should restore the literal `</script>`.
    const html = `<script id="data" type="application/json">{"note":"a <\\/script> tag"}</script>`
    const parsed = parseDataIslandFromHtml<{ note: string }>(html, 'data')
    expect(parsed).toEqual({ note: 'a </script> tag' })
  })

  it('escapes regex metachars in scriptId', () => {
    const matchingHtml = '<script id="data.x" type="application/json">{"ok":true}</script>'
    const decoyHtml = '<script id="dataXx" type="application/json">{"ok":true}</script>'
    expect(parseDataIslandFromHtml<{ ok: boolean }>(matchingHtml, 'data.x')).toEqual({ ok: true })
    expect(parseDataIslandFromHtml<{ ok: boolean }>(decoyHtml, 'data.x')).toBeNull()
  })
})
