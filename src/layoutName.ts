import { parse } from 'node:path'

const REGEX_BACKSLASH = /\\/g
const REGEX_SEPARATORS = /[\s_.]+/g
const REGEX_NON_ALPHANUMERIC = /[^a-z0-9-]+/gi
const REGEX_REPEATED_DASH = /-+/g
const REGEX_EDGE_DASH = /^-|-$/g
const REGEX_NUMBER = /\d/

function isUppercase(char = ''): boolean | undefined {
  if (REGEX_NUMBER.test(char))
    return undefined

  return char !== char.toLowerCase()
}

function splitByCase(value: string): string[] {
  const parts: string[] = []
  let buffer = ''
  let previousUpper: boolean | undefined
  let previousSplitter: boolean | undefined

  for (const char of value) {
    const isSplitter = REGEX_SEPARATORS.test(char)
    REGEX_SEPARATORS.lastIndex = 0

    if (isSplitter) {
      if (buffer)
        parts.push(buffer)
      buffer = ''
      previousUpper = undefined
      previousSplitter = true
      continue
    }

    const isUpper = isUppercase(char)

    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        if (buffer)
          parts.push(buffer)
        buffer = char
        previousUpper = isUpper
        continue
      }

      if (previousUpper === true && isUpper === false && buffer.length > 1) {
        const lastChar = buffer.at(-1)!
        parts.push(buffer.slice(0, -1))
        buffer = lastChar + char
        previousUpper = isUpper
        continue
      }
    }

    buffer += char
    previousUpper = isUpper
    previousSplitter = false
  }

  if (buffer)
    parts.push(buffer)

  return parts
}

export function kebabCaseSegment(value: string): string {
  return splitByCase(value)
    .join('-')
    .replace(REGEX_NON_ALPHANUMERIC, '-')
    .replace(REGEX_REPEATED_DASH, '-')
    .replace(REGEX_EDGE_DASH, '')
    .toLowerCase()
}

function removeOverlappingPrefix(parentSegments: string[], fileSegments: string[]) {
  let overlap = 0
  const maxOverlap = Math.min(parentSegments.length, fileSegments.length)

  for (let length = maxOverlap; length > 0; length -= 1) {
    const parentTail = parentSegments.slice(parentSegments.length - length)
    const fileHead = fileSegments.slice(0, length)

    if (parentTail.join('-') === fileHead.join('-')) {
      overlap = length
      break
    }
  }

  return fileSegments.slice(overlap)
}

export function normalizeLayoutName(file: string): string {
  const normalizedFile = file.replace(REGEX_BACKSLASH, '/')
  const parsed = parse(normalizedFile)
  const parentSegments = parsed.dir
    .split('/')
    .filter(Boolean)
    .map(kebabCaseSegment)
    .flatMap(segment => segment.split('-'))
    .filter(Boolean)

  if (parsed.name === 'index')
    return parentSegments.join('-') || 'index'

  const fileSegments = kebabCaseSegment(parsed.name).split('-').filter(Boolean)
  const dedupedFileSegments = removeOverlappingPrefix(parentSegments, fileSegments)

  return [...parentSegments, ...dedupedFileSegments].join('-')
}
