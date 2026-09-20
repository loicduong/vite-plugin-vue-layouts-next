# [3.0.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v2.1.0...v3.0.0) (2026-09-03)


### Bug Fixes

* **examples:** use default SSG formatting ([5bf4b84](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/5bf4b840689f59b35215e4ef3c2ed78bc9772c2e))
* use native dirname in Vitest config ([3c2c2f7](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/3c2c2f79ced4d30016d485371e5390ce1ab9d263))


### Features

* **v3:** support nuxt compatible layout name normalization ([#32](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/32)) ([77f7793](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/77f77931a08b08f06814f75351d7561ba8329a23))

### BREAKING CHANGES

- remove `vite-plugin-pages` support and the `pagesDirs` option. Use Vue Router 5 file-based routing as the route source ([#30](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/30))
- nested layout names no longer use slash-separated paths. Use `sub-layoutsub` instead of `sub/layoutsub`

# [2.1.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v2.0.1...v2.1.0) (2026-03-18)


### Features

* support vite 8 ([65ccbd0](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/65ccbd0dd52175ce487f1c6b4d0187cc2ffbc3f0))

## [2.0.1](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v2.0.0...v2.0.1) (2026-02-12)

### Bug Fixes

- Use `pnpm publish` so `catalog:` is resolved in the published tarball (fixes install from npm registry)

# [2.0.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v1.3.0...v2.0.0) (2026-02-12) [YANKED]


### Bug Fixes

* expect to use catalog instead of plain specifier ([858557d](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/858557d598619e87ba1a5d7c72d4e35e8840a7fe))


### Features

* support vue router 5 ([0dedec8](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/0dedec8082cee24ba4514edc345460b082ddb353))
* use make a changelog ([51d7490](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/51d7490289f4c86c30771cf12b11540a0337cf19))
* use standard readme ([9ba81a3](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/9ba81a38cb353c4cd8f19416170b1239d29f3ed4))

# [1.3.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v1.2.0...v1.3.0) (2025-11-24)


### Features

* add inherit default layout option ([6af15a2](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/6af15a2e3018d327aa21de1a7485664aa6142c76))

# [1.2.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v1.1.1...v1.2.0) (2025-11-03)


### Features

* convert from tsup to tsdown ([b161a52](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/b161a52bf3244c795e3b76052d1cfd0cf4fab374))

## [1.1.1](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v1.1.0...v1.1.1) (2025-10-23)


### Bug Fixes

* wrong setupLayouts type ([e4d93f9](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/e4d93f980ba2930dc3bcc426f7f07e6128667d41))

# [1.1.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v1.0.0...v1.1.0) (2025-10-23)

### Features

- Support Unplugin Vue Router 0.16

# [1.0.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.1.5...v1.0.0) (2025-07-01)


### Bug Fixes

* remove deprecated module ([a00fa4a](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/a00fa4aa75a9d8d8dcaad250703d2291c16b78c0))

### BREAKING CHANGES

- Remove `cjs` export
- Remove `layouts-generated` module
- **Examples:** Remove vitesse

## [0.1.5](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.1.4...v0.1.5) (2025-06-09)


### Bug Fixes

* use correct package exports ([#8](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/8)) ([91e63e1](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/91e63e1bd49e5a6eb18e2cac930fa14644a140f6))

## [0.1.4](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.1.3...v0.1.4) (2025-06-07)

### Miscellaneous

- **Deps:** update deps

## [0.1.3](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.1.2...v0.1.3) (2025-05-30)

### Miscellaneous

- **Deps:** update deps

## [0.1.2](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.1.1...v0.1.2) (2025-05-19)

### Miscellaneous

- **Deps:** update deps

## [0.1.1](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.1.0...v0.1.1) (2025-05-05)


### Reverts

* add component wrapping ([89ad848](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/89ad848b8f82658085eb883c6fbe7d3dd2ad1cb7))

### BREAKING CHANGES

- Revert component wrapping

# [0.1.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.14...v0.1.0) (2025-05-03)


### Features

* add component wrapping ([e232630](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/e2326305984fa4c6094be1c404e59d880aa1cc5b))

## [0.0.14](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.13...v0.0.14) (2025-04-25)

### Miscellaneous

- **Deps:** update deps

## [0.0.13](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.12...v0.0.13) (2025-04-17)

### Miscellaneous

- **Deps:** update deps

## [0.0.12](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.11...v0.0.12) (2025-04-12)

### Miscellaneous

- **Deps:** update deps

## [0.0.11](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.10...v0.0.11) (2025-04-08)

### Miscellaneous

- **Deps:** update deps

## [0.0.10](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.9...v0.0.10) (2025-04-03)

### Miscellaneous

- **Deps:** update deps

## [0.0.9](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.8...v0.0.9) (2025-03-29)

### Miscellaneous

- **Deps:** update deps

## [0.0.8](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.7...v0.0.8) (2025-03-25)

### Miscellaneous

- **Deps:** update deps

## [0.0.7](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.6...v0.0.7) (2025-03-19)

### Miscellaneous

- **Deps:** update deps

## [0.0.6](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.5...v0.0.6) (2025-03-14)

### Miscellaneous

- **Docs:** update configuration doc
- **Deps:** update deps

## [0.0.5](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.4...v0.0.5) (2025-03-14)

### Miscellaneous

- No user-facing changes

## [0.0.4](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.3...v0.0.4) (2025-03-08)

### Miscellaneous

- **Deps:** update deps

## [0.0.3](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.2...v0.0.3) (2025-02-25)

### Miscellaneous

- **Deps:** use `vite` 6.2, `vue` 3.5, `typescript` 5.7, etc.
- **Docs:** update `unplugin-vue-router` config after version 0.9.0
- **Examples:** update deps in vitesse

## [0.0.2](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.1...v0.0.2) (2025-02-25)

### Miscellaneous

- **Docs:** update README

## [0.0.1](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/v0.0.0...v0.0.1) (2025-02-25)

### Features

- Support Vite 6

# [0.0.0](https://github.com/loicduong/vite-plugin-vue-layouts-next/compare/c570e9327470f3be324318609f911ecb02ab331c...v0.0.0) (2025-02-25)


### Bug Fixes

* **ClientSideLayout:** more user-friendly virtual ID, close [#126](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/126) ([#127](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/127)) ([e3909c7](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/e3909c78066a8e606c16de79b478c96f8e175e28))
* correct reload ([043bc5b](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/043bc5b09b65103006756ce399e2574d815b796a))
* emit event name ([cf46f3c](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/cf46f3c2d8d2a72a904384ae56e6cfd85f9dd01d))
* extra .html generated when vite-ssg dirStyles flat ([51ace5f](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/51ace5fbd7a345a077f6157058bb0fa8c511f9ce))
* layout resolving on SSG ([26827d8](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/26827d85b5ba001454f132cd5ea282d830dea6bd))
* layouts on nested routes / unplugin-vue-router ([406a402](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/406a40228cc80ca04258d3cbc58c9d7d362691df)), closes [#120](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/120) [#78](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/78)
* old vite2 regex, closes [#124](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/124) ([4fd2d78](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/4fd2d78404fc3f136a81d0746e422495f370af2c))
* only watch pages and layouts dir for module reloading ([526fbf6](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/526fbf63012643709a4daaa0f862c077fdf6d582)), closes [#94](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/94)
* slash for sub layouts ([#3](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/3)) ([1c40a14](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/1c40a14a1ddcdc7cf25407f78416929a10fb0d68))
* ssg compatibility ([c570e93](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/c570e9327470f3be324318609f911ecb02ab331c))
* synchronize the logic of clientLayout to defaultLayout, close [#130](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/130) ([#132](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/132)) ([2270f71](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/2270f71e39394c5223dc87cb0893f4c803931547))
* typo in readme, closes [#122](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/122) ([0b69567](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/0b695673a74d00ed3ce8b2833a2e3d28567468f8))


### Features

* add client-side ([c278c0d](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/c278c0d22f2d9c55f61a0c386219d109b6ceed48))
* add no layout support ([eaaa8c3](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/eaaa8c38f3732fc9b08cef75b032ff7aa5ac33cc))
* added extensions option ([6912511](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/69125118737ec48f719d8bf78ca100ca1e918877))
* alternative getRoutes that filters layouts ([31d3474](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/31d347429f2cbb517d78ed00e5b2c8f45a149ab2)), closes [#55](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/55)
* multiple layoutdirs ([29ba3b3](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/29ba3b37d87b04911d7a6370da91fa5cd18a7157))
* support layout dir globs ([1cead57](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/1cead574cf7af15c6f53586a86b378c758e47cdf)), closes [#119](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/119)
* support vite 3.0 ([4f822fd](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/4f822fd7386252de62e0066484900863e7017076))
* support Vite 4.0 ([e9bf0d0](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/e9bf0d06b37d7c340fe653a6ba3a2e97c60a0191))
* use fastest plugin available based on options ([8e76bad](https://github.com/loicduong/vite-plugin-vue-layouts-next/commit/8e76bad69ff3cfaa28710ee90cc793681cc4b0d4)), closes [#131](https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/131)
