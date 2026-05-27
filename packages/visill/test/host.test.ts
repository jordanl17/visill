import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendPrompt } from '../src/host'

describe('sendPrompt', () => {
  const originalSendPrompt = globalThis.sendPrompt

  beforeEach(() => {
    globalThis.sendPrompt = vi.fn()
  })

  afterEach(() => {
    globalThis.sendPrompt = originalSendPrompt
  })

  it('forwards the text to globalThis.sendPrompt exactly once', () => {
    sendPrompt('hi')

    expect(globalThis.sendPrompt).toHaveBeenCalledTimes(1)
    expect(globalThis.sendPrompt).toHaveBeenCalledWith('hi')
  })
})
