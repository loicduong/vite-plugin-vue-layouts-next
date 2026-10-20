# Stale layouts with a relative `layoutsDirs`

With a relative `layoutsDirs` (the default `src/layouts` too), saving a layout file used to do nothing: no HMR update, no full reload, and even F5 served the old module until Vite restarted.

## Cause

`configureServer` called `watcher.add(options.layoutsDirs)` with the raw, relative option. Chokidar then reported changes in that folder relative to the cwd (`src/layouts/default.vue`) instead of absolute. Vite's `moduleGraph.onFileChange` and the plugin's own `isLayoutFile` both missed that path, so nothing was invalidated.

```
[watcher] change src/layouts/default.vue                     <- relative layoutsDirs
[watcher] change /.../examples/stale/src/layouts/default.vue <- absolute layoutsDirs
```

The plugin now watches the dirs already resolved in `configResolved`.

## Reproduce

From the repository root:

```sh
pnpm install
pnpm build
pnpm -C examples/stale dev
```

Open http://localhost:5600/, then change `v0` in `src/layouts/default.vue`. The page reloads and shows the new version, and the `[watcher]` log prints an absolute path. `ABSOLUTE=1 pnpm -C examples/stale dev` passes an absolute `layoutsDirs` for comparison.

The example uses the built plugin from `dist`, so run `pnpm build` again after changing `src`.
