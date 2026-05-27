declare global {
  function sendPrompt(text: string): void
}

export function sendPrompt(text: string): void {
  globalThis.sendPrompt(text)
}
