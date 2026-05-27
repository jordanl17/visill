import { delegate } from './delegate'

describe('delegate', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('fires on a matching descendant exactly once with the matched element and currentTarget = root', () => {
    const root = document.createElement('div')
    const button = document.createElement('button')
    button.className = 'action'
    root.appendChild(button)
    document.body.appendChild(root)

    const captured: { target: Element | null; currentTarget: EventTarget | null } = {
      target: null,
      currentTarget: null,
    }
    const handler = vi.fn<(event: MouseEvent, target: Element) => void>((event, target) => {
      captured.target = target
      captured.currentTarget = event.currentTarget
    })
    delegate(root, '.action', 'click', handler)

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(captured.target).toBe(button)
    expect(captured.currentTarget).toBe(root)
  })

  test('walks closest() so a click on a child of the matching element reports the matching ancestor', () => {
    const root = document.createElement('div')
    const card = document.createElement('article')
    card.className = 'card'
    const inner = document.createElement('span')
    card.appendChild(inner)
    root.appendChild(card)
    document.body.appendChild(root)

    const handler = vi.fn<(event: MouseEvent, target: Element) => void>()
    delegate(root, '.card', 'click', handler)

    inner.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]![1]).toBe(card)
  })

  test('does not fire on a non-matching click', () => {
    const root = document.createElement('div')
    const other = document.createElement('p')
    other.className = 'other'
    root.appendChild(other)
    document.body.appendChild(root)

    const handler = vi.fn<(event: MouseEvent, target: Element) => void>()
    delegate(root, '.action', 'click', handler)

    other.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(handler).not.toHaveBeenCalled()
  })

  test('unsubscribe stops further invocations', () => {
    const root = document.createElement('div')
    const button = document.createElement('button')
    button.className = 'action'
    root.appendChild(button)
    document.body.appendChild(root)

    const handler = vi.fn<(event: MouseEvent, target: Element) => void>()
    const unsubscribe = delegate(root, '.action', 'click', handler)

    unsubscribe()
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(handler).not.toHaveBeenCalled()
  })

  test('ignores matches that live outside root, even if the selector matches them', () => {
    const root = document.createElement('div')
    const sibling = document.createElement('button')
    sibling.className = 'action'
    document.body.append(root, sibling)

    const handler = vi.fn<(event: MouseEvent, target: Element) => void>()
    delegate(root, '.action', 'click', handler)

    sibling.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(handler).not.toHaveBeenCalled()
  })
})
