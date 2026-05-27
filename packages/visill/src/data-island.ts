import { requireElement } from './require-element'

export function readDataIsland<DataShape>(scriptId: string): DataShape {
  const scriptElement = requireElement<HTMLScriptElement>(`#${scriptId}`)
  const raw = scriptElement.textContent ?? ''
  if (raw.trim().length > 0) {
    return JSON.parse(raw) as DataShape
  }
  throw new Error(`readDataIsland: data island "#${scriptId}" has empty textContent`)
}
