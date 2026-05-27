/*
 * jsdom runtime tests for the hello-world widget.
 *
 * jsdom does not execute <script type="module"> natively, so we extract
 * the module script body and re-inject it as a plain <script> element
 * appended to the document. jsdom runs that in its own window realm,
 * distinct from the test's document.defaultView - sendPrompt calls are
 * routed through `document` (the shared object) so the spy can observe
 * them across realms.
 *
 * Slot filling is delegated to the real render.py pipeline (python3 with
 * the payload piped through stdin) so these tests exercise the production
 * substitution path end-to-end, not an inline JS substitute.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseDataIslandFromHtml } from '@visill/test'

const prefixes = ['visill-', 'claude-skill-']

const stripPrefix = (name: string): string => {
  const matched = prefixes.find((prefix) => name.startsWith(prefix))
  return matched ? name.slice(matched.length) : name
}

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
  name: string
}
const skillName = stripPrefix(packageJson.name)
const skillDir = resolve(__dirname, '../../skill', skillName)
const renderPath = resolve(skillDir, 'scripts/render.py')

const MODULE_SCRIPT_PATTERN = /<script\s+type="module">([\s\S]*?)<\/script>/g

const GREETING = 'world'

interface RenderedBundle {
  html: string
  scriptBody: string
  htmlWithoutModuleScript: string
}

const renderBundle = (payload: Record<string, unknown>): RenderedBundle => {
  const result = spawnSync('python3', [renderPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      `render.py exited with status ${result.status}. Run \`pnpm build\` first.\nstderr: ${result.stderr}`,
    )
  }
  const html = result.stdout
  const matches = Array.from(html.matchAll(MODULE_SCRIPT_PATTERN))
  if (matches.length === 0) {
    throw new Error('Rendered bundle has no <script type="module"> - run `pnpm build` first')
  }
  return {
    html,
    scriptBody: matches[matches.length - 1]?.[1] ?? '',
    htmlWithoutModuleScript: html.replace(MODULE_SCRIPT_PATTERN, ''),
  }
}

const filledBundle = renderBundle({ name: GREETING })

interface SendPromptSpy {
  calls: string[]
}

interface DocumentBridge {
  __widgetWindow?: unknown
  __sendPromptCalls?: string[]
}

// The widget script's `window` is a separate realm from the test's
// `document.defaultView`. They share `document` but not the global
// object. Mirror sendPrompt's call list onto `document` (shared) so
// the test can read it without bridging across realms.
const installWidget = (bundle: RenderedBundle): void => {
  document.body.innerHTML = bundle.htmlWithoutModuleScript
  const harness = document.createElement('script')
  harness.textContent =
    'document.__sendPromptCalls = []; ' +
    'window.sendPrompt = (text) => { document.__sendPromptCalls.push(text); }; ' +
    'document.__widgetWindow = window; ' +
    bundle.scriptBody
  document.body.appendChild(harness)
}

const loadWidget = (): SendPromptSpy => {
  installWidget(filledBundle)
  const bridge = document as unknown as DocumentBridge
  return {
    get calls(): string[] {
      return bridge.__sendPromptCalls ?? []
    },
  } as SendPromptSpy
}

describe('hello-world widget runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('data island carries the name from the rendered payload', () => {
    const island = parseDataIslandFromHtml<{ name: string }>(filledBundle.html, 'root-data')
    expect(island).not.toBeNull()
    expect(island?.name).toBe(GREETING)
  })

  it('renders a greeting paragraph and a send button into #root after load', () => {
    loadWidget()
    const root = document.querySelector<HTMLElement>('#root')
    expect(root).not.toBeNull()
    const body = root?.querySelector<HTMLElement>('.body')
    expect(body?.textContent).toBe(`Hello, ${GREETING}!`)
    const button = root?.querySelector<HTMLButtonElement>('#send-greeting')
    expect(button).not.toBeNull()
    expect(button?.type).toBe('button')
  })

  it('clicking the send button forwards the rendered greeting to sendPrompt', () => {
    const spy = loadWidget()
    const button = document.querySelector<HTMLButtonElement>('#send-greeting')
    button?.click()
    expect(spy.calls).toEqual([`Hello, ${GREETING}!`])
  })

  it('escapes HTML metacharacters in the payload before rendering or sending', () => {
    const hostile = '<script>alert(1)</script>'
    installWidget(renderBundle({ name: hostile }))

    const body = document.querySelector<HTMLElement>('#root .body')
    // textContent decodes entities, so the literal characters round-trip.
    expect(body?.textContent).toBe(`Hello, ${hostile}!`)
    // innerHTML keeps the entity-encoded form, proving no live <script> was injected.
    expect(body?.innerHTML).not.toContain('<script>')
    expect(body?.innerHTML).toContain('&lt;script&gt;')
    // The data island never executes, so no extra prompts fire before the click.
    const bridge = document as unknown as DocumentBridge
    expect(bridge.__sendPromptCalls).toEqual([])

    document.querySelector<HTMLButtonElement>('#send-greeting')?.click()
    expect(bridge.__sendPromptCalls).toEqual([`Hello, ${hostile}!`])
  })
})
