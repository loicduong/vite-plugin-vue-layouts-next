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

type CaseBoundary = 'before' | 'after' | undefined

/**
 * Where a word boundary falls when `char` follows `buffer` with no separator:
 * `before` for `aB`, `after` for `ABc` (the last upper starts the next word).
 */
function caseBoundary(previousUpper: boolean | undefined, isUpper: boolean | undefined, buffer: string): CaseBoundary {
  if (previousUpper === false && isUpper === true)
    return 'before'
  if (previousUpper === true && isUpper === false && buffer.length > 1)
    return 'after'
  return undefined
}

function splitByCase(value: string): string[] {
  const parts: string[] = []
  let buffer = ''
  let previousUpper: boolean | undefined
  let previousSplitter: boolean | undefined

  const flush = () => {
    if (buffer)
      parts.push(buffer)
  }

  for (const char of value) {
    const isSplitter = REGEX_SEPARATORS.test(char)
    REGEX_SEPARATORS.lastIndex = 0

    if (isSplitter) {
      flush()
      buffer = ''
      previousUpper = undefined
      previousSplitter = true
      continue
    }

    const isUpper = isUppercase(char)
    const boundary = previousSplitter === false ? caseBoundary(previousUpper, isUpper, buffer) : undefined

    if (boundary === 'before') {
      flush()
      buffer = char
    }
    else if (boundary === 'after') {
      parts.push(buffer.slice(0, -1))
      buffer = buffer.at(-1)! + char
    }
    else {
      buffer += char
    }
    previousUpper = isUpper
    previousSplitter = false
  }

  flush()

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
  const slashIndex = normalizedFile.lastIndexOf('/')
  const dir = slashIndex === -1 ? '' : normalizedFile.slice(0, slashIndex)
  const basename = slashIndex === -1 ? normalizedFile : normalizedFile.slice(slashIndex + 1)
  const dotIndex = basename.lastIndexOf('.')
  // Mirror node:path parse(): a leading dot with no other dot is the whole name, not an extension.
  const name = dotIndex <= 0 ? basename : basename.slice(0, dotIndex)
  const prefixParts = splitByCase(dir)
  const fileName = dir && name.toLowerCase() === 'index' ? '' : name
  const segments = resolveLayoutNameSegments(fileName, prefixParts).filter(Boolean)

  return kebabCaseSegments(segments)
}
