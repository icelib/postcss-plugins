# postcss-pxtrans

## 1.0.5

### Patch Changes

- Harden unit conversion edge cases, prevent `replace: false` fallback re-entry, improve large stylesheet performance, and expand release and type validation coverage.

- Updated dependencies:
  - postcss-plugin-shared@1.1.6
  - postcss-rule-unit-converter@0.2.4

## 1.0.4

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

## 1.0.3

### Patch Changes

- 🐛 **Migrate package builds from `tsup` to `tsdown` and align generated ESM/CJS declaration outputs.** [`96d9158`](https://github.com/icelib/postcss-plugins/commit/96d9158903efbfd1ba0d3827a60f8769f782a5ee) by @sonofmagic
  - For `postcss-pxtrans`, add a dedicated CommonJS compatibility entry so existing `require('postcss-pxtrans')` usage keeps working alongside the new `tsdown` pipeline.
- 📦 **Dependencies** [`96d9158`](https://github.com/icelib/postcss-plugins/commit/96d9158903efbfd1ba0d3827a60f8769f782a5ee)
  → `postcss-plugin-shared@1.1.3`

## 1.0.2

### Patch Changes

- 🐛 **Migrate package TypeScript config for TypeScript 6 compatibility and remove legacy type resolution config.** [`beca84b`](https://github.com/icelib/postcss-plugins/commit/beca84b55e2bacffb2b6f1ee675354a7bf0791a5) by @sonofmagic
- 📦 **Dependencies** [`beca84b`](https://github.com/icelib/postcss-plugins/commit/beca84b55e2bacffb2b6f1ee675354a7bf0791a5)
  → `postcss-plugin-shared@1.1.2`

## 1.0.1

### Patch Changes

- 🐛 **chore: align type exports and improve public JSDoc** [`08dfed0`](https://github.com/icelib/postcss-plugins/commit/08dfed04a234e4fe023f2ca2cf2390ce51cb4cfc) by @sonofmagic
- 📦 **Dependencies** [`01a19b2`](https://github.com/icelib/postcss-plugins/commit/01a19b27a75ae4835ffc2eb533d381e72ac70655)
  → `postcss-plugin-shared@1.1.0`

## 1.0.0

### Major Changes

- [`524f957`](https://github.com/icelib/postcss-plugins/commit/524f95760f453558847063ed0f8843ff809bf475) Thanks [@sonofmagic](https://github.com/sonofmagic)! - 优化 pxtrans 性能：缓存默认 rootValue 计算、复用正则与选择器黑名单匹配结果，减少每次声明的重复开销，并记录新的基准数据。

### Patch Changes

- [`a93567c`](https://github.com/icelib/postcss-plugins/commit/a93567cbc9e1faeee15408a5c2c087d797bcfe61) Thanks [@sonofmagic](https://github.com/sonofmagic)! - Extract common utilities into `postcss-plugin-shared` and refactor related plugins to reuse them.

- [`92f38a5`](https://github.com/icelib/postcss-plugins/commit/92f38a57fe8a4026791772483618df15ce6de343) Thanks [@sonofmagic](https://github.com/sonofmagic)! - 提炼并统一多个插件的公共能力到 `postcss-plugin-shared`：

  - 新增 `createUnitRegex`（可配置单位/跳过规则）并用其生成默认的 `pxRegex`/`remRegex`
  - 新增 `createAdvancedPropListMatcher` 支持 pxtrans 的高级 `propList` 语法（包含/排除、前后缀、contains）
  - 新增 `maybeBlacklistedSelector`（非字符串 selector 返回 `undefined`）
  - 新增 `createConfigGetter` 用于构建 `getConfig`（基于 `mergeOptions`，数组覆盖而非合并）

- Updated dependencies [[`a93567c`](https://github.com/icelib/postcss-plugins/commit/a93567cbc9e1faeee15408a5c2c087d797bcfe61), [`92f38a5`](https://github.com/icelib/postcss-plugins/commit/92f38a57fe8a4026791772483618df15ce6de343)]:
  - postcss-plugin-shared@1.0.0
