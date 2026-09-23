# postcss-rule-unit-converter

## 0.2.3

### Patch Changes

- 🐛 **Fix CommonJS plugin entries so `require()` returns a callable PostCSS plugin while preserving the default and named exports.** [#44](https://github.com/icelib/postcss-plugins/pull/44) by @sonofmagic

## 0.2.2

### Patch Changes

- 🐛 **Improve unit converter preset migration types and readonly option compatibility.** [`74f5130`](https://github.com/icelib/postcss-plugins/commit/74f5130baf76547aa9eb2d7a22a00b996017f3b8) by @sonofmagic
- 📦 **Dependencies** [`74f5130`](https://github.com/icelib/postcss-plugins/commit/74f5130baf76547aa9eb2d7a22a00b996017f3b8)
  → `postcss-plugin-shared@1.1.5`

## 0.2.1

### Patch Changes

- 🐛 **Improve `propList` exclusion matching so negated entries are easier to use in** [`c060ee4`](https://github.com/icelib/postcss-plugins/commit/c060ee45106be6ab1439a34ccef5b903ddd24deb) by @sonofmagic
  real-world configs.

  For `createPropListMatcher`-based packages and `postcss-rem-to-responsive-pixel`,
  negated string entries now support:

  - exact exclusions like `!font-size`
  - glob exclusions like `!padding*`
  - arbitrary-position glob exclusions like `!--wot-*-font-size`

  Also align `createAdvancedPropListMatcher` with the same glob behavior for
  strings containing `*`, which also affects `postcss-pxtrans`.

- 📦 **Dependencies** [`c060ee4`](https://github.com/icelib/postcss-plugins/commit/c060ee45106be6ab1439a34ccef5b903ddd24deb)
  → `postcss-plugin-shared@1.1.4`

## 0.2.0

### Minor Changes

- ✨ **Add a new unified PostCSS unit conversion plugin with composable rules and built-in presets.** [`e5706ce`](https://github.com/icelib/postcss-plugins/commit/e5706cece138f14543b084c25a5287d7968bd241) by @sonofmagic

- ✨ **Enhance the rule unit converter with grouped presets, richer public typing docs, and expanded English and Chinese usage documentation.** [`57b562f`](https://github.com/icelib/postcss-plugins/commit/57b562fdf558388e6da62cf88db7079abc4fdae4) by @sonofmagic

- ✨ **Add typed custom preset authoring helpers and document how to create custom presets and grouped presets.** [`676f492`](https://github.com/icelib/postcss-plugins/commit/676f4922f47e88c5117093161563e054af982e44) by @sonofmagic

### Patch Changes

- 🐛 **Expose raw unit match context to custom transform rules and document how to use it in advanced presets and rule callbacks.** [`a9810b2`](https://github.com/icelib/postcss-plugins/commit/a9810b28eb466fb1447639d65bac4f90ba61bb95) by @sonofmagic

- 🐛 **Add `unitRegex` and `keepZeroUnit` options for advanced matching control and zero-value output compatibility.** [`a18d253`](https://github.com/icelib/postcss-plugins/commit/a18d2536ede763f649c03ec1c2c361d2ebd07ef6) by @sonofmagic

- 🐛 **Migrate package TypeScript config for TypeScript 6 compatibility and remove legacy type resolution config.** [`beca84b`](https://github.com/icelib/postcss-plugins/commit/beca84b55e2bacffb2b6f1ee675354a7bf0791a5) by @sonofmagic

- 🐛 **Add cookbook documentation with practical configuration recipes for common unit conversion workflows.** [`3f516e1`](https://github.com/icelib/postcss-plugins/commit/3f516e1a8dabbf85d459697bf799b8bc7a9e0c28) by @sonofmagic

- 🐛 **Adjust the build configuration to emit named CommonJS exports and remove mixed export warnings during packaging.** [`b838156`](https://github.com/icelib/postcss-plugins/commit/b838156d2223f656fbd051fd2caf6364b926213b) by @sonofmagic

- 🐛 **Fix strict TypeScript typing in the rule unit converter internals and add a dedicated package typecheck script.** [`7e3a550`](https://github.com/icelib/postcss-plugins/commit/7e3a5504591d1a840d596bdf21423860114c16c6) by @sonofmagic
- 📦 **Dependencies** [`beca84b`](https://github.com/icelib/postcss-plugins/commit/beca84b55e2bacffb2b6f1ee675354a7bf0791a5)
  → `postcss-plugin-shared@1.1.2`

## 0.1.0

- Initial release.
