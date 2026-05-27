import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

export interface FinalizeBundleOptions {
  outDir?: string
  sourceName?: string
  targetName?: string
  sizeLimit?: number
}

// `rel="stylesheet"` and `crossorigin` are leftovers from the original <link>/
// <script src=...> tags and are no-ops on inlined <style>/<script> blocks.
// `type="module"` MUST stay - it defers execution until the DOM is parsed so
// module-top DOM lookups find their targets even when Vite hoists the script.
const htmlTransforms: Array<(html: string) => string> = [
  (html) => html.replace(/<style\s+rel="stylesheet"\s+crossorigin>/g, '<style>'),
  (html) => html.replace(/<script\s+type="module"\s+crossorigin>/g, '<script type="module">'),
  (html) =>
    html
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n'),
]

export function finalizeBundle(options: FinalizeBundleOptions = {}): Plugin {
  const sourceName = options.sourceName ?? 'widget.html'
  const targetName = options.targetName ?? 'widget-bundled.html'
  return {
    name: 'visill:finalize-bundle',
    enforce: 'post',
    writeBundle(writeOptions) {
      const outDir = options.outDir ?? writeOptions.dir
      if (outDir === undefined) {
        throw new Error('finalize-bundle: no outDir resolved')
      }
      const source = join(outDir, sourceName)
      const target = join(outDir, targetName)
      const finalized = htmlTransforms.reduce(
        (html, transform) => transform(html),
        readFileSync(source, 'utf8'),
      )
      const byteLength = Buffer.byteLength(finalized, 'utf8')
      if (options.sizeLimit !== undefined && byteLength > options.sizeLimit) {
        throw new Error(
          `finalize-bundle: ${byteLength} bytes exceeds limit ${options.sizeLimit} bytes`,
        )
      }
      writeFileSync(target, finalized, 'utf8')
      unlinkSync(source)
      this.info(`finalize-bundle: wrote ${target} (${byteLength.toLocaleString()} bytes)`)
    },
  }
}
