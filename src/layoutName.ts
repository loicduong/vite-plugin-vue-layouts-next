import { parse } from 'node:path'

const REGEX_BACKSLASH = /\\/g
const REGEX_SEPARATORS = /[-_/.\s]+/g
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

function kebabCaseSegments(segments: string[]): string {
  return segments
    .map(segment => segment.toLowerCase())
    .join('-')
    .replace(REGEX_NON_ALPHANUMERIC, '-')
    .replace(REGEX_REPEATED_DASH, '-')
    .replace(REGEX_EDGE_DASH, '')
}

function resolveLayoutNameSegments(fileName: string, prefixParts: string[]): string[] {
  const fileNameParts = splitByCase(fileName)
  const fileNamePartsContent = fileNameParts.join('/').toLowerCase()
  const layoutNameParts = prefixParts.flatMap(part => splitByCase(part))
  const matchedSuffix: string[] = []
  let index = prefixParts.length - 1

  while (index >= 0) {
    const prefixPart = prefixParts[index]!
    matchedSuffix.unshift(...splitByCase(prefixPart).map(part => part.toLowerCase()))
    const matchedSuffixContent = matchedSuffix.join('/')

    if (
      fileNamePartsContent === matchedSuffixContent
      || fileNamePartsContent.startsWith(`${matchedSuffixContent}/`)
      || (
        prefixPart.toLowerCase() === fileNamePartsContent
        && prefixParts[index + 1]
        && prefixParts[index] === prefixParts[index + 1]
      )
    ) {
      layoutNameParts.length = index
    }

    index -= 1
  }

  return [...layoutNameParts, ...fileNameParts]
}

export function normalizeLayoutName(file: string): string {
  const normalizedFile = file.replace(REGEX_BACKSLASH, '/')
  const parsed = parse(normalizedFile)
  const prefixParts = splitByCase(parsed.dir)
  const fileName = parsed.name.toLowerCase() === 'index' ? '' : parsed.name
  const segments = resolveLayoutNameSegments(fileName, prefixParts).filter(Boolean)

  return kebabCaseSegments(segments)
}
