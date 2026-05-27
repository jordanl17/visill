export function ownDescendant<ElementType extends Element = HTMLElement>(
  root: Element,
  selector: string,
): ElementType | undefined {
  const matches = Array.from(root.querySelectorAll<ElementType>(selector))
  return matches.find(
    (matchedElement) =>
      matchedElement.parentElement === root ||
      matchedElement.parentElement?.closest(selector) === root,
  )
}
