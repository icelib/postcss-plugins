# postcss-pxtrans

[English](./README.md) | 简体中文

PostCSS 单位转换插件（px -> rpx/rem/vw/px），用于多端样式适配。兼容原 `postcss-pxtransform` 配置风格，支持平台指令注释（#ifdef/#ifndef）与 RN eject。

如果你需要在一个插件里组合多套规则、自定义 preset，或者混合处理 `px/rem/rpx/vw/vh`，更建议直接使用 `postcss-rule-unit-converter`。如果你依赖 `pxtrans` 这套平台预设和指令注释工作流，则继续使用 `postcss-pxtrans`。如果想看一一对应的迁移写法，可以直接看 [`postcss-rule-unit-converter` 迁移文档](../postcss-rule-unit-converter/MIGRATION.zh-CN.md)。

## 安装

```bash
pnpm add -D postcss-pxtrans
```

## 快速开始

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

## 预设（platform）

`platform` 可以理解为一组预设，它决定默认的 `targetUnit`、参与转换的单位范围，以及 `rootValue` 的计算方式。你仍然可以通过 `targetUnit`、`rootValue`、`deviceRatio` 等选项覆写预设行为。

### weapp 预设

默认把 `px` 转成 `rpx`，`rpx` 不参与转换。

```ts
pxTransform({ platform: 'weapp', designWidth: 750 })
// h1 { margin: 20px; } -> h1 { margin: 20rpx; }
```

可指定 `targetUnit`（`rpx | rem | px | vw | vmin`）：

```ts
pxTransform({ platform: 'weapp', designWidth: 750, targetUnit: 'rem' })
// 20px -> 0.5rem
```

默认预设要点：

- `targetUnit`: `rpx`
- `rootValue`: `1 / deviceRatio[designWidth]`

### h5 预设

默认把 `px` 转成 `rem`，`rpx` 也会参与转换（可用于从小程序样式迁移到 H5）。

```ts
pxTransform({ platform: 'h5', designWidth: 640 })
// 20px -> 0.585rem
```

可指定 `targetUnit` 为 `px | vw | vmin | rem`：

```ts
pxTransform({ platform: 'h5', designWidth: 640, targetUnit: 'vw' })
// 320px -> 50vw
```

默认预设要点（取决于 `targetUnit`）：

- `targetUnit: 'rem'` -> `rootValue = (baseFontSize / deviceRatio[designWidth]) * 2`
- `targetUnit: 'vw' | 'vmin'` -> `rootValue = designWidth / 100`
- `targetUnit: 'px'` -> `rootValue = (1 / deviceRatio[designWidth]) * 2`

### rn 预设

直接转换成 `px`，按设备比例缩放。

```ts
pxTransform({
  platform: 'rn',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
})
// 100px -> 50px
```

默认预设要点：

- `targetUnit`: `px`
- `rootValue`: `(1 / deviceRatio[designWidth]) * 2`

### quickapp 预设

保持 `px` 不变（以 1:1 输出）。

```ts
pxTransform({ platform: 'quickapp', designWidth: 750 })
// 100px -> 100px
```

默认预设要点：

- `targetUnit`: `px`
- `rootValue`: `1`

### harmony 预设

主要规则：

- 普通 `px` 按比例转换为 `px`
- 大写/混合写法 `PX/Px/pX` 会转为 `ch`
- `onePxTransform: false` 时，1px 仍会转成 `ch`
- 命中 `selectorBlackList` 时仍会走 `ch` 路径

```ts
pxTransform({
  platform: 'harmony',
  designWidth: 640,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
})
// 100PX -> 100ch
```

默认预设要点：

- `targetUnit`: `px`
- `rootValue`: `1 / deviceRatio[designWidth]`

## 指令注释（平台条件 / 禁用）

指令能力由 `createDirectivePlugin` 提供，需要与主插件一起使用：

```ts
import postcss from 'postcss'
import pxTransform, { createDirectivePlugin } from 'postcss-pxtrans'

const result = await postcss([
  createDirectivePlugin({ platform: 'h5' }),
  pxTransform({ platform: 'h5', designWidth: 640 }),
]).process(css, { from: 'input.css' })
```

支持的指令：

```css
/*postcss-pxtrans disable*/
/*  #ifdef  h5  */
/*  #ifndef  weapp  */
/*  #endif  */
```

RN eject：

```css
/*postcss-pxtrans rn eject enable*/
.a {
  width: 10px;
}
/*postcss-pxtrans rn eject disable*/
```

## 选项说明

> 保持 `postcss-pxtransform` 的命名兼容；部分 legacy key 仍可用（如 `root_value`, `unit_precision`）。

- `platform`: `weapp | h5 | rn | quickapp | harmony`（预设），默认 `weapp`
- `designWidth`: `number | (input) => number`，默认 `750`
- `targetUnit`: `rpx | rem | px | vw | vmin`（平台相关）
- `deviceRatio`: `Record<number, number>`，用于按设计宽度映射比例
- `rootValue`: `number | (input, m, value) => number`，自定义换算基数
- `baseFontSize`: `number`，仅 `rem`/`h5` 场景下参与计算
- `minRootSize`: `number`，当未传 `baseFontSize` 时用于兜底
- `methods`: `['platform', 'size']`，可禁用平台指令或尺寸转换
- `unitPrecision`: `number`，小数保留位数
- `selectorBlackList`: `(string | RegExp)[]`，命中则跳过（Harmony 仍会转 `ch`）
- `propList`: `string[]`，属性白/黑名单（支持通配符与取反，也支持 `!--wot-*-font-size` 这类模式）
- `replace`: `boolean`，`false` 时追加新声明
- `mediaQuery`: `boolean`，是否转换 `@media` 中的 px
- `minPixelValue`: `number`，小于该值时不转换（Harmony 仍会转 `ch`）
- `onePxTransform`: `boolean`，是否转换 1px（Harmony 下 `PX` 仍转 `ch`）
- `exclude`：`Array<string | RegExp> | (filePath?: string) => boolean`，命中直接跳过整文件

> 说明：插件内部复用了 `postcss-plugin-shared` 的通用能力（propList 匹配、单位正则构建等）。

### `exclude`、`selectorBlackList`、`propList` 怎么选

- `exclude`：文件级跳过，命中后整个文件都不处理
- `selectorBlackList`：选择器级跳过，文件仍会继续处理
- `propList`：属性级控制，在命中的规则里决定哪些属性处理、哪些属性跳过

适合用 `exclude` 的场景是 `node_modules`、生成产物、整类文件不想处理。
适合用 `selectorBlackList` 的场景是某些组件或规则整体保留原样。适合用
`propList` 的场景是文件和选择器仍然需要处理，但像 `font-size` 或
`--wot-*-font-size` 这样的属性需要跳过。

## 常见配置场景

### 设计稿宽度按文件动态调整

```ts
pxTransform({
  platform: 'h5',
  designWidth(input) {
    return input.file?.includes('nutui') ? 375 : 750
  },
})
```

### 自定义 rootValue

```ts
pxTransform({
  platform: 'h5',
  designWidth: 750,
  rootValue: 10,
})
```

### 只转换部分属性

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

### 黑名单选择器

```ts
pxTransform({
  platform: 'h5',
  designWidth: 640,
  selectorBlackList: ['.ignore', /^body$/],
})
```

### 保留原值并追加转换值

```ts
pxTransform({
  platform: 'h5',
  designWidth: 640,
  replace: false,
})
// .rule { font-size: 15px; font-size: 0.43875rem }
```

### 转换 @media

```ts
pxTransform({
  platform: 'h5',
  designWidth: 640,
  mediaQuery: true,
})
```

### 跳过指定文件

```ts
pxTransform({
  platform: 'h5',
  designWidth: 750,
  exclude(filePath) {
    return filePath === 'skip.css'
  },
})
```

## PostCSS 配置示例

```js
// postcss.config.cjs
const pxTransform = require('postcss-pxtrans')

module.exports = {
  plugins: [
    pxTransform({ platform: 'weapp', designWidth: 750 }),
  ],
}
```

如需指令注释支持，请同时引入 `createDirectivePlugin` 并放在主插件前：

```js
const { createDirectivePlugin } = require('postcss-pxtrans')

module.exports = {
  plugins: [
    createDirectivePlugin({ platform: 'h5' }),
    pxTransform({ platform: 'h5', designWidth: 640 }),
  ],
}
```
