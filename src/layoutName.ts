import { parse } from 'node:path'

const REGEX_BACKSLASH = /\\/g
const REGEX_CAMEL_CASE = /([a-z0-9])([A-Z])/g
const REGEX_SEPARATORS = /[\s_.]+/g
const REGEX_NON_ALPHANUMERIC = /[^a-zA-Z0-9-]+/g
const REGEX_REPEATED_DASH = /-+/g
const REGEX_EDGE_DASH = /^-|-$/g

export function kebabCaseSegment(value: string): string {
  return value
    .replace(REGEX_CAMEL_CASE, '$1-$2')
    .replace(REGEX_SEPARATORS, '-')
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
