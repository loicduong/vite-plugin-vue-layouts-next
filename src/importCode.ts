import type { FileContainer, ResolvedOptions } from './types'
import { join, parse } from 'node:path'

export function getImportCode(files: FileContainer[], options: ResolvedOptions) {
  const imports: string[] = []
  const head: string[] = []
  let id = 0

  for (const __ of files) {
    for (const file of __.files) {
      const path = __.path.substr(0, 1) === '/' ? `${__.path}/${file}` : `/${__.path}/${file}`
      const parsed = parse(file)
      const name = join(parsed.dir, parsed.name).replace(/\\/g, '/')
      if (options.importMode(name) === 'sync') {
        const variable = `__layout_${id}`
        head.push(`import ${variable} from '${path}'`)
        imports.push(/* js */`'${name}': { layout: ${variable}, isSync: true },`)
        id += 1
      }
      else {
        imports.push(/* js */`'${name}': { layout: () => import('${path}'), isSync: false },`)
      }
    }
  }

  let importsCode = `
${head.join('\n')}
export const layouts = {
${imports.join('\n')}
}`

  if (options.wrapComponent) {
    const vueImports = []
    const nullImports = []
    vueImports.push('h')
    if (id > 0)
      vueImports.push('defineAsyncComponent')
    else
      nullImports.push('defineAsyncComponent')
    if ((imports.length - id) > 0)
      vueImports.push('defineComponent')
    else
      nullImports.push('defineComponent')
    importsCode = `
import { ${vueImports.join(', ')} } from 'vue'
${importsCode}
${nullImports.map(v => `const ${v} = null`).join('\n')}
`
  }

  return importsCode
}
