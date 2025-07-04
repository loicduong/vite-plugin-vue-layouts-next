import type { FileContainer, ResolvedOptions } from './types'
import { join, parse } from 'node:path'

export function getImportCode(files: FileContainer[], options: ResolvedOptions) {
  const imports: string[] = []
  const head: string[] = []
  let id = 0

  for (const __ of files) {
    for (const file of __.files) {
      const path = __.path.startsWith('/') ? `${__.path}/${file}` : `/${__.path}/${file}`
      const parsed = parse(file)
      const name = join(parsed.dir, parsed.name).replace(/\\/g, '/')
      if (options.importMode(name) === 'sync') {
        const variable = `__layout_${id}`
        head.push(`import ${variable} from '${path}'`)
        imports.push(`'${name}': ${variable},`)
        id += 1
      }
      else {
        imports.push(`'${name}': () => import('${path}'),`)
      }
    }
  }

  const importsCode = `
${head.join('\n')}
export const layouts = {
${imports.join('\n')}
}`
  return importsCode
}
