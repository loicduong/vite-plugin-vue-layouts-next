export const returnLayoutRoute = /* js */ `
/** @type {import('vue-router').RouteRecordRaw} */
const layoutRoute = {
  path: route.path,
  component: layouts[layout],
  meta: { ...route.meta, isLayout: true },
  // Handle root path specially to avoid infinite nesting
  children: top && route.path === '/' 
    ? [route] 
    : [{ ...route, path: '', meta: { ...route.meta, isLayout: false } }]
}
return layoutRoute
`

export const returnLayoutComponent = /* js */ `
if (!route.component) {
  return route
}
/** @type {import('vue-router').RouteRecordRaw} */
const wrappedRoute = {
  ...route,
  component: h('div', [
    h(layouts[layout].layout),
    h(layouts[layout].isSync ? defineComponent(() => route.component()) : defineAsyncComponent(() => route.component())),
  ]),
  meta: {
    ...route.meta,
    isLayout: true
  }
}
return wrappedRoute
`
