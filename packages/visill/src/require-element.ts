export function requireElement<ElementType extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): ElementType {
  const matched = root.querySelector(selector)
  if (matched === null) {
    throw new Error(`requireElement: no element matched selector ${selector}`)
  }
  return matched as unknown as ElementType
}
