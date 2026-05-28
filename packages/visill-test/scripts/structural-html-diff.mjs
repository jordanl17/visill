#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { argv, exit, stderr, stdout } from 'node:process'

const USAGE =
  'Usage: structural-html-diff <fileA.html> <fileB.html>\n' +
  '  Compares two HTML files across three regions: module-script body,\n' +
  '  inlined <style> blob, and data-island <script type="application/json"> skeletons.\n' +
  '  Exit 0 on structural equality, 1 on mismatch, 2 on usage error.\n'

const printUsageAndExit = (code) => {
  const stream = code === 0 ? stdout : stderr
  stream.write(USAGE)
  exit(code)
}

const collapseWhitespace = (text) =>
  text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')

const parseAttributes = (attrString) => {
  const pattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
  return Array.from(attrString.matchAll(pattern)).reduce((accumulator, match) => {
    const [, name, doubleQuoted, singleQuoted, bare] = match
    accumulator[name.toLowerCase()] = doubleQuoted ?? singleQuoted ?? bare ?? ''
    return accumulator
  }, {})
}

const findTags = (html, tagName) => {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)</${tagName}>`, 'gi')
  return Array.from(html.matchAll(pattern)).map(([, attrString, body]) => ({
    attributes: parseAttributes(attrString),
    body,
  }))
}

const extractModuleScriptBody = (html) => {
  const scripts = findTags(html, 'script')
  const moduleScript = scripts.find(({ attributes }) => attributes.type === 'module')
  if (moduleScript === undefined) {
    return ''
  }
  return collapseWhitespace(moduleScript.body)
}

const extractStyleBlob = (html) => {
  const styles = findTags(html, 'style')
  const concatenated = styles.map(({ body }) => body).join('\n')
  return collapseWhitespace(concatenated)
}

const topLevelKeysOf = (parsedValue) => {
  if (parsedValue === null || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    return []
  }
  return Object.keys(parsedValue).sort()
}

const extractDataIslandSkeleton = (html) => {
  const scripts = findTags(html, 'script')
  const islands = scripts.filter(
    ({ attributes }) => attributes.type === 'application/json' && typeof attributes.id === 'string',
  )
  const skeleton = islands.map(({ attributes, body }) => {
    try {
      const parsed = JSON.parse(body.trim())
      return { id: attributes.id, keys: topLevelKeysOf(parsed), parseError: null }
    } catch (error) {
      return { id: attributes.id, keys: [], parseError: error.message }
    }
  })
  return skeleton.sort((left, right) => left.id.localeCompare(right.id))
}

const serializeSkeleton = (skeleton) =>
  skeleton.map(({ id, keys }) => `${id}:${keys.join(',')}`).join('|')

const formatSkeleton = (skeleton) =>
  skeleton
    .map(({ id, keys, parseError }) => {
      const keyList = keys.length === 0 ? '(no keys)' : keys.join(', ')
      const errorSuffix = parseError === null ? '' : ` [parse error: ${parseError}]`
      return `  #${id}: ${keyList}${errorSuffix}`
    })
    .join('\n')

const reportRegionDiff = (regionLabel, leftValue, rightValue, fileA, fileB) => {
  stdout.write(`--- ${fileA} (${regionLabel})\n`)
  stdout.write(`+++ ${fileB} (${regionLabel})\n`)
  stdout.write(`- ${leftValue}\n`)
  stdout.write(`+ ${rightValue}\n`)
}

const safeRead = (filePath) => {
  try {
    return readFileSync(filePath, 'utf8')
  } catch (error) {
    stderr.write(`Error reading ${filePath}: ${error.message}\n`)
    exit(2)
  }
}

const main = () => {
  const args = argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printUsageAndExit(0)
  }
  if (args.length !== 2) {
    printUsageAndExit(2)
  }
  const [fileA, fileB] = args
  const htmlA = safeRead(fileA)
  const htmlB = safeRead(fileB)

  const moduleA = extractModuleScriptBody(htmlA)
  const moduleB = extractModuleScriptBody(htmlB)
  const styleA = extractStyleBlob(htmlA)
  const styleB = extractStyleBlob(htmlB)
  const skeletonA = extractDataIslandSkeleton(htmlA)
  const skeletonB = extractDataIslandSkeleton(htmlB)

  const mismatches = []
  if (moduleA !== moduleB) {
    mismatches.push('module-script')
  }
  if (styleA !== styleB) {
    mismatches.push('style')
  }
  if (serializeSkeleton(skeletonA) !== serializeSkeleton(skeletonB)) {
    mismatches.push('data-island-skeleton')
  }

  if (mismatches.length === 0) {
    exit(0)
  }

  stdout.write(`Structural mismatch in: ${mismatches.join(', ')}\n\n`)
  if (mismatches.includes('module-script')) {
    reportRegionDiff('module-script', moduleA, moduleB, fileA, fileB)
    stdout.write('\n')
  }
  if (mismatches.includes('style')) {
    reportRegionDiff('style', styleA, styleB, fileA, fileB)
    stdout.write('\n')
  }
  if (mismatches.includes('data-island-skeleton')) {
    stdout.write(`--- ${fileA} (data-island-skeleton)\n`)
    stdout.write(`${formatSkeleton(skeletonA)}\n`)
    stdout.write(`+++ ${fileB} (data-island-skeleton)\n`)
    stdout.write(`${formatSkeleton(skeletonB)}\n`)
  }
  exit(1)
}

main()
