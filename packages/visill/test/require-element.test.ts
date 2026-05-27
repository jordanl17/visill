import { beforeEach, describe, expect, test } from 'vitest'

import { requireElement } from '../src/require-element'

describe('requireElement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('returns the element when the selector matches in document', () => {
    const target = document.createElement('button')
    target.id = 'submit'
    document.body.appendChild(target)

    const found = requireElement<HTMLButtonElement>('#submit')
    expect(found).toBe(target)
  })

  test('throws an Error whose message contains the selector when absent', () => {
    const selector = '.missing-node'
    expect(() => requireElement(selector)).toThrow(Error)
    expect(() => requireElement(selector)).toThrow(selector)
  })

  test('honours an explicit root and returns the descendant under that subtree', () => {
    const root = document.createElement('section')
    const descendant = document.createElement('span')
    descendant.className = 'label'
    root.appendChild(descendant)
    document.body.appendChild(root)

    const found = requireElement<HTMLSpanElement>('.label', root)
    expect(found).toBe(descendant)
  })

  test('ignores matches that live outside the provided root', () => {
    const outside = document.createElement('span')
    outside.className = 'label'
    outside.textContent = 'outside'

    const root = document.createElement('section')
    const inside = document.createElement('span')
    inside.className = 'label'
    inside.textContent = 'inside'
    root.appendChild(inside)

    document.body.append(outside, root)

    const found = requireElement<HTMLSpanElement>('.label', root)
    expect(found).toBe(inside)
    expect(found).not.toBe(outside)
  })
})
