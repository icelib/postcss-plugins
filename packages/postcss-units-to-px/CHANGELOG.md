# postcss-units-to-px

## 0.2.4

### Patch Changes

- Harden unit conversion edge cases, prevent `replace: false` fallback re-entry, improve large stylesheet performance, and expand release and type validation coverage.

- Updated dependencies:
  - postcss-plugin-shared@1.1.6
  - postcss-rule-unit-converter@0.2.4

## 0.2.3

### Patch Changes

- 🐛 **Fix CommonJS plugin entries so `require()` returns a callable PostCSS plugin while preserving the default and named exports.** [#44](https://github.com/icelib/postcss-plugins/pull/44) by @sonofmagic

## 0.2.2

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

## 0.2.1

### Patch Changes

- 🐛 **Refactor unit conversion internals to reuse the shared rule unit converter while preserving matcher and transform behavior.** [`3aa4776`](https://github.com/icelib/postcss-plugins/commit/3aa4776f343e034461c149099068dc74c7e40511) by @sonofmagic

- 🐛 **Migrate package TypeScript config for TypeScript 6 compatibility and remove legacy type resolution config.** [`beca84b`](https://github.com/icelib/postcss-plugins/commit/beca84b55e2bacffb2b6f1ee675354a7bf0791a5) by @sonofmagic
- 📦 **Dependencies** [`beca84b`](https://github.com/icelib/postcss-plugins/commit/beca84b55e2bacffb2b6f1ee675354a7bf0791a5)
  → `postcss-plugin-shared@1.1.2`

## 0.2.0

### Minor Changes

- ✨ **Add matcher-based `unitMap` support plus `false` rules/transform to skip conversions. Expose `defaultUnitMap` via the `postcss-units-to-px/defaults` subpath.** [`94bb67a`](https://github.com/icelib/postcss-plugins/commit/94bb67a469c403bd8c15fd1e97ea68f836036c95) by @sonofmagic

## 0.1.0

### Minor Changes

- ✨ **Add shared walk/blacklist helpers, refactor unit conversion plugins to use them, and introduce the new postcss-units-to-px package.** [`01a19b2`](https://github.com/icelib/postcss-plugins/commit/01a19b27a75ae4835ffc2eb533d381e72ac70655) by @sonofmagic

### Patch Changes

- 🐛 **chore: align type exports and improve public JSDoc** [`08dfed0`](https://github.com/icelib/postcss-plugins/commit/08dfed04a234e4fe023f2ca2cf2390ce51cb4cfc) by @sonofmagic
- 📦 **Dependencies** [`01a19b2`](https://github.com/icelib/postcss-plugins/commit/01a19b27a75ae4835ffc2eb533d381e72ac70655)
  → `postcss-plugin-shared@1.1.0`
