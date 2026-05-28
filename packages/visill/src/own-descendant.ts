export function ownDescendant<ElementType extends Element = HTMLElement>(
  root: Element,
  selector: string,
  boundary?: string,
): ElementType | undefined {
  const boundarySelector = boundary ?? selector
  return Array.from(root.querySelectorAll<ElementType>(selector)).find((matchedElement) => {
    if (matchedElement.parentElement === root) {
      return true
    }
    const nearestBoundary = matchedElement.parentElement?.closest(boundarySelector) ?? null
    return nearestBoundary === root
  })
}
