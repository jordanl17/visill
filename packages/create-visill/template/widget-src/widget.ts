import type {} from './globals'
import { readDataIsland, readyDOM, requireElement, sendPrompt } from '@visill/sdk'

interface RootData {
  name: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function main(): void {
  const { name } = readDataIsland<RootData>('root-data')
  const rootContainer = requireElement<HTMLElement>('#root')

  const greeting = `Hello, ${name}!`
  const safeGreeting = `Hello, ${escapeHtml(name)}!`

  rootContainer.innerHTML = `
    <div class="root">
      <p class="body">${safeGreeting}</p>
      <button id="send-greeting" type="button">Send greeting to chat</button>
    </div>
  `

  const sendButton = requireElement<HTMLButtonElement>('#send-greeting', rootContainer)
  sendButton.addEventListener('click', () => {
    sendPrompt(greeting)
  })
}

readyDOM(main)
