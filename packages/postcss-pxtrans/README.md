# postcss-pxtrans

PostCSS unit conversion plugin (px → rpx/rem/vw/px) for multi-platform responsive styling. It is compatible with the legacy `postcss-pxtransform` option style, and supports directive comments (`#ifdef/#ifndef`) and RN eject.

If you need multi-rule composition, custom preset authoring, or to mix `px/rem/rpx/vw/vh` conversions in one plugin, prefer `postcss-rule-unit-converter`. Keep `postcss-pxtrans` when you specifically need its platform presets and directive comment workflow. For side-by-side migration examples, see [`postcss-rule-unit-converter` migration guide](../postcss-rule-unit-converter/MIGRATION.md).

English | [简体中文](./README.zh-CN.md)

## Install

```bash
pnpm add -D postcss-pxtrans
```

## Quick start

```ts
import postcss from 'postcss'
import pxTransform from 'postcss-pxtrans'

const result = await postcss([
  pxTransform({
    platform: 'h5',
    designWidth: 640,
  }),
]).process('h1 { margin: 0 0 20px; font-size: 32px; }', { from: undefined })

console.log(result.css)
// h1 { margin: 0 0 0.585rem; font-size: 0.936rem; }
```

## Presets (`platform`)

`platform` is a preset collection that determines the default `targetUnit`, which units will be transformed, and how `rootValue` is computed. You can still override preset behavior via `targetUnit`, `rootValue`, `deviceRatio`, etc.

### `weapp`

By default, converts `px` to `rpx`, and does not transform `rpx`.

```ts
pxTransform({ platform: 'weapp', designWidth: 750 })
// h1 { margin: 20px; } -> h1 { margin: 20rpx; }
```

You can set `targetUnit` (`rpx | rem | px | vw | vmin`):

```ts
pxTransform({ platform: 'weapp', designWidth: 750, targetUnit: 'rem' })
// 20px -> 0.5rem
```

Preset defaults:

- `targetUnit`: `rpx`
- `rootValue`: `1 / deviceRatio[designWidth]`

### `h5`

By default, converts `px` to `rem`, and also transforms `rpx` (useful when migrating MiniProgram styles to H5).

```ts
pxTransform({ platform: 'h5', designWidth: 640 })
// 20px -> 0.585rem
```

You can set `targetUnit` to `px | vw | vmin | rem`:

```ts
pxTransform({ platform: 'h5', designWidth: 640, targetUnit: 'vw' })
// 320px -> 50vw
```

Preset defaults (depends on `targetUnit`):

- `targetUnit: 'rem'` -> `rootValue = (baseFontSize / deviceRatio[designWidth]) * 2`
- `targetUnit: 'vw' | 'vmin'` -> `rootValue = designWidth / 100`
- `targetUnit: 'px'` -> `rootValue = (1 / deviceRatio[designWidth]) * 2`

### `rn`

Converts to `px` directly, scaled by device ratio.

```ts
pxTransform({
  platform: 'rn',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
})
// 100px -> 50px
```

Preset defaults:

- `targetUnit`: `px`
- `rootValue`: `(1 / deviceRatio[designWidth]) * 2`

### `quickapp`

Keeps `px` unchanged (1:1 output).

```ts
pxTransform({ platform: 'quickapp', designWidth: 750 })
// 100px -> 100px
```

Preset defaults:

- `targetUnit`: `px`
- `rootValue`: `1`

### `harmony`

Key rules:

- Normal `px` values are scaled and kept as `px`
- Upper/mixed case units `PX/Px/pX` are converted to `ch`
- With `onePxTransform: false`, `1px` still becomes `ch`
- If `selectorBlackList` matches, it still goes through the `ch` path

```ts
pxTransform({
  platform: 'harmony',
  designWidth: 640,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
})
// 100PX -> 100ch
```

Preset defaults:

- `targetUnit`: `px`
- `rootValue`: `1 / deviceRatio[designWidth]`

## Directive comments (platform conditions / disable)

Directive handling is provided by `createDirectivePlugin`, and should be used together with the main plugin:

```ts
import postcss from 'postcss'
import pxTransform, { createDirectivePlugin } from 'postcss-pxtrans'

const result = await postcss([
  createDirectivePlugin({ platform: 'h5' }),
  pxTransform({ platform: 'h5', designWidth: 640 }),
]).process(css, { from: 'input.css' })
```

Supported directives:

```css
/*postcss-pxtrans disable*/
/*  #ifdef  h5  */
/*  #ifndef  weapp  */
/*  #endif  */
```

RN eject:

```css
/*postcss-pxtrans rn eject enable*/
.a {
  width: 10px;
}
/*postcss-pxtrans rn eject disable*/
```

## Options

> Keeps naming compatible with `postcss-pxtransform`. Some legacy keys still work (e.g. `root_value`, `unit_precision`).

- `platform`: `weapp | h5 | rn | quickapp | harmony` preset, default `weapp`
- `designWidth`: `number | (input) => number`, default `750`
- `targetUnit`: `rpx | rem | px | vw | vmin` (platform-dependent)
- `deviceRatio`: `Record<number, number>` mapping by design width
- `rootValue`: `number | (input, m, value) => number` custom base
- `baseFontSize`: `number`, used for `rem`/`h5` calculations
- `minRootSize`: `number`, fallback when `baseFontSize` is not provided
- `methods`: `['platform', 'size']`, can disable directive handling or size conversion
- `unitPrecision`: `number`, decimal precision
- `selectorBlackList`: `(string | RegExp)[]`, skip if matched (Harmony still converts to `ch`)
- `propList`: `string[]`, property allow/deny list (wildcards and negation supported, including patterns like `!--wot-*-font-size`)
- `replace`: `boolean`, when `false` it appends a new declaration
- `mediaQuery`: `boolean`, convert px in `@media`
- `minPixelValue`: `number`, values lower than this are not converted (Harmony still converts to `ch`)
- `onePxTransform`: `boolean`, whether to convert `1px` (Harmony still converts `PX` to `ch`)
- `exclude`: `Array<string | RegExp> | (filePath?: string) => boolean`, skip the whole file when matched

> Note: internally this plugin reuses utilities from `postcss-plugin-shared` for prop matching and unit regex building.

### Choosing Between `exclude`, `selectorBlackList`, and `propList`

- `exclude`: skip the whole file before any declaration is processed
- `selectorBlackList`: skip matching selectors inside an otherwise processed file
- `propList`: skip or include specific CSS properties inside matched selectors

Use `exclude` for file-level boundaries such as `node_modules` or generated CSS.
Use `selectorBlackList` when a rule or component should be left untouched. Use
`propList` when the file and selector should still be processed, but some
properties such as `font-size` or `--wot-*-font-size` should be skipped.

## Common recipes

### Dynamic `designWidth` per file

```ts
pxTransform({
  platform: 'h5',
  designWidth(input) {
    return input.file?.includes('nutui') ? 375 : 750
  },
})
```

### Custom `rootValue`

```ts
pxTransform({
  platform: 'h5',
  designWidth: 750,
  rootValue: 10,
})
```

### Transform only specific properties

```ts
pxTransform({
  platform: 'h5',
  designWidth: 640,
  propList: ['*font*', 'margin*', '!margin-left', '*-right', 'pad'],
})

pxTransform({
  platform: 'h5',
  designWidth: 640,
  propList: ['*', '!--wot-*', '!--wot-fs-*', '!--wot-*-font-size'],
})
```

### Selector blacklist

```ts
pxTransform({
  platform: 'h5',
  designWidth: 640,
  selectorBlackList: ['.ignore', /^body$/],
})
```

### Keep original and append converted value

```ts
pxTransform({
  platform: 'h5',
  designWidth: 640,
  replace: false,
})
// .rule { font-size: 15px; font-size: 0.43875rem }
```

### Convert `@media`

```ts
pxTransform({
  platform: 'h5',
  designWidth: 640,
  mediaQuery: true,
})
```

### Skip specific files

```ts
pxTransform({
  platform: 'h5',
  designWidth: 750,
  exclude(filePath) {
    return filePath === 'skip.css'
  },
})
```

## PostCSS config example

```js
// postcss.config.cjs
const pxTransform = require('postcss-pxtrans')

module.exports = {
  plugins: [
    pxTransform({ platform: 'weapp', designWidth: 750 }),
  ],
}
```

If you need directive comments, also include `createDirectivePlugin` before the main plugin:

```js
const { createDirectivePlugin } = require('postcss-pxtrans')

module.exports = {
  plugins: [
    createDirectivePlugin({ platform: 'h5' }),
    pxTransform({ platform: 'h5', designWidth: 640 }),
  ],
}
```
