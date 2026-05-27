import { describe, expect, test, vi } from 'vitest'

import { readyDOM } from '../src/ready-dom'

function stubReadyState(value: DocumentReadyState): () => void {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    get: () => value,
  })
  return () => {
    Reflect.deleteProperty(document, 'readyState')
  }
}

describe('readyDOM', () => {
  test('defers init until DOMContentLoaded when document is loading', () => {
    const restoreReadyState = stubReadyState('loading')
    try {
      const initSpy = vi.fn()
      readyDOM(initSpy)
      expect(initSpy).not.toHaveBeenCalled()

      document.dispatchEvent(new Event('DOMContentLoaded'))
      expect(initSpy).toHaveBeenCalledTimes(1)
    } finally {
      restoreReadyState()
    }
  })

  test('invokes init synchronously when document is already complete', () => {
    const restoreReadyState = stubReadyState('complete')
    try {
      const initSpy = vi.fn()
      readyDOM(initSpy)
      expect(initSpy).toHaveBeenCalledTimes(1)
    } finally {
      restoreReadyState()
    }
  })
})
