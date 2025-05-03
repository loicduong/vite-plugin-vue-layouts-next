import { dirname, resolve } from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRoutesContext } from 'unplugin-vue-router';
import type { Options as RoutesOptions, TreeNode } from 'unplugin-vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { normalizePath } from 'vite';

const currentDir = dirname(fileURLToPath(new URL(import.meta.url)));
const currentDirNormalized = normalizePath(currentDir);
export const baseDir = resolve(currentDir, 'fixtures');

const generatedDir = resolve(currentDir, 'generated');
let checkedForGeneratedDir = false;
export const codeToModule = async (code: string, id: string) => {
  if (!checkedForGeneratedDir) {
    checkedForGeneratedDir = true;
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }
  }

  const filePath = resolve(generatedDir, `${id}.ts`); // Changed to .mjs
  try {
    fs.writeFileSync(filePath, code);
    // Dynamic import with error handling
    try {
      const module = await import(filePath);
      return module;
    } catch (importError) {
      console.error('Import error:', importError);
      throw importError;
    }
  } catch (error) {
    console.error('File write error:', error);
    throw error;
  }
};

export const DEFAULT_OPTIONS = {
  extensions: ['.vue'],
  exclude: [],
  routesFolder: 'src/pages',
  filePatterns: ['**/*'],
  routeBlockLang: 'json5',
  getRouteName: getFileBasedRouteName,
  importMode: 'sync',
  root: process.cwd(),
  dts: false,
  logs: false,
  _inspect: false,
  pathParser: {
    dotNesting: true,
  },
  dataFetching: false,
} satisfies RoutesOptions;
/**
 * Joins the path segments of a node into a name that corresponds to the filepath represented by the node.
 *
 * @param node - the node to get the path from
 * @returns a route name
 */
export function getFileBasedRouteName(node: TreeNode): string {
  if (!node.parent) return '';
  return `${getFileBasedRouteName(node.parent)}/${node.value.rawSegment === 'index' ? '' : node.value.rawSegment}`;
}
// Generate routes from fixtures
export const getRoutes = async () => {
  const routesContext = createRoutesContext({
    ...DEFAULT_OPTIONS,
    routesFolder: [
      {
        src: resolve(baseDir, 'pages'),
        path: '',
      },
    ],
  });
  await routesContext.scanPages();
  const routesCode = routesContext.generateRoutes();
  return await codeToModule(routesCode, 'routes');
};

export function sanitizeComponentPaths(component: Exclude<RouteRecordRaw['component'], undefined | null>) {
  if (typeof component === 'string') return component;
  if (typeof component === 'function') return component;
  const keys = Object.keys(component);
  for (const key of keys) {
    if (key === '__file' && typeof component[key] === 'string') {
      component[key] = component[key].replace(currentDirNormalized, '.');
    }
    if (key === 'type' && typeof component[key] === 'object' && '__file' in component[key]) {
      component[key]['__file'] = component[key]['__file'].replace(currentDirNormalized, '.');
    }
    if (key === 'children' && Array.isArray(component[key]) && component[key].length > 0) {
      component[key] = component[key].map(sanitizeComponentPaths);
    }
  }
  if (component.children || component.type) {
    return {
      children: component.children,
      type: component.type,
    };
  }
  return component;
}

export function sanitizeRouteComponentPaths(routes: RouteRecordRaw[]) {
  return routes.map((route) => {
    if (route.children) {
      route.children = sanitizeRouteComponentPaths(route.children);
    }
    if (route.component) {
      route.component = sanitizeComponentPaths(route.component);
    }
    return route;
  });
}
