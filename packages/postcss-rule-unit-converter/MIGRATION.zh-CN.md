# Migration Guide

把老包迁移到 `postcss-rule-unit-converter`，保留换算公式，并检查下文的匹配边界变化。

- 总览与快速上手：[README.zh-CN.md](./README.zh-CN.md)
- API 文档：[API.zh-CN.md](./API.zh-CN.md)
- 场景示例：[COOKBOOK.zh-CN.md](./COOKBOOK.zh-CN.md)
- Preset 编写指南：[PRESET_AUTHORING.zh-CN.md](./PRESET_AUTHORING.zh-CN.md)

## 匹配行为变化

规则引擎默认使用 CSS tokenizer，完整解析带符号数字与科学计数法，解码单位并按
小写匹配，保护字符串、URL、标识符及任意深度的整个 `var()` fallback。
回调收到带符号数值，`minValue` 按绝对值比较。旧配置若依赖正则子串匹配或
转换 `var()` 中的内容，请查看 [匹配边界](./API.zh-CN.md#匹配边界)，仅在确实
需要时显式配置 `unitRegex`。

## 什么时候该迁移

如果你需要下面这些能力，更建议迁移到 `postcss-rule-unit-converter`：

- 一个插件统一处理多套单位体系
- 自定义 preset / preset group
- 显式控制规则顺序
- 用一套统一 API 替代多个包各自的配置方式

如果你当前主要诉求是保持老配置、老包名、老接入方式不变，那就继续使用老包。

## `postcss-rem-to-viewport`

老写法：

```ts
import remToViewport from 'postcss-rem-to-viewport'

remToViewport({
  rootValue: 375,
  transformUnit: 'vw',
  propList: ['font', 'font-size', 'line-height', 'letter-spacing'],
  unitPrecision: 16,
})
```

统一插件写法：

```ts
import unitConverter, { presets } from 'postcss-rule-unit-converter'

unitConverter({
  propList: ['font', 'font-size', 'line-height', 'letter-spacing'],
  unitPrecision: 16,
  rules: [
    presets.remToViewport({
      rootValue: 16,
      viewportWidth: 375,
      to: 'vw',
    }),
  ],
})
```

选项映射：

- `rootValue` -> `viewportWidth`
- `transformUnit` -> `to`
- `minRemValue` -> `minValue`
- `propList`、`selectorBlackList`、`replace`、`mediaQuery`、`exclude`、`disabled` -> 同名选项

## `postcss-rem-to-responsive-pixel`

老写法：

```ts
import remToResponsivePixel from 'postcss-rem-to-responsive-pixel'

remToResponsivePixel({
  rootValue: 16,
  transformUnit: 'rpx',
  propList: ['*'],
})
```

统一插件写法：

```ts
import unitConverter, { presets } from 'postcss-rule-unit-converter'

unitConverter({
  propList: ['*'],
  rules: [
    presets.remToRpx({
      rootValue: 16,
    }),
  ],
})
```

如果原来是 `transformUnit: 'px'`，则改为 `presets.remToPx({ rootValue })`。

选项映射：

- `rootValue` -> `rootValue`
- `transformUnit: 'px'` -> `presets.remToPx(...)`
- `transformUnit: 'rpx'` -> `presets.remToRpx(...)`
- `minRemValue` -> `minValue`
- `processorStage` -> 不需要；统一插件固定在 `Once`
- `propList`、`selectorBlackList`、`replace`、`mediaQuery`、`exclude`、`disabled` -> 同名选项

## `postcss-units-to-px`

老写法：

```ts
import unitsToPx from 'postcss-units-to-px'

unitsToPx({
  unitMap: {
    rem: 16,
    vw: 3.75,
    rpx: 0.5,
  },
})
```

统一插件写法：

```ts
import unitConverter, { presets } from 'postcss-rule-unit-converter'

unitConverter({
  rules: presets.unitsToPx({
    unitMap: {
      rem: 16,
      vw: 3.75,
      rpx: 0.5,
    },
  }),
})
```

兜底 transform 示例：

```ts
unitConverter({
  rules: presets.unitsToPx({
    unitMap: [
      [/^q$/, null],
      ['vw', false],
    ],
    transform(value, unit, context) {
      return unit === 'q' && context.prop === 'margin' ? value * 4 : undefined
    },
  }),
})
```

迁移说明：

- `presets.unitsToPx()` 已经覆盖默认的 `rem/em/vw/vh/vmin/vmax/rpx -> px`
- 对象形式的 `unitMap` 会覆盖并合并默认值，和 `postcss-units-to-px` 保持一致
- `Map` 和数组形式的 `unitMap` 会保留用户传入顺序，并且不合并默认值
- 单个单位规则为 `false` 时跳过该单位
- 单个单位规则为 `null` 或运行时 `undefined` 时走 `transform(value, unit, context)` 兜底

## `postcss-pxtrans`

`postcss-pxtrans` 除了尺寸转换，还包含平台预设和指令注释处理。以下场景建议继续保留：

- 依赖 `createDirectivePlugin()`
- 依赖 `platform` 预设配置
- 依赖 Harmony 的 `PX/Px/pX -> ch` 专用行为

如果你只需要尺寸转换逻辑，统一插件里等价的 rule 形态大致如下：

```ts
import unitConverter from 'postcss-rule-unit-converter'

unitConverter({
  rules: [
    {
      from: unit => unit === 'px' || unit === 'rpx',
      to: 'rem',
      transform(value) {
        return value / 34.18803418803419
      },
    },
  ],
})
```

但如果你要完整复刻 `pxtrans` 的平台默认值、指令能力和边界兼容行为，通常还是继续使用 `postcss-pxtrans` 更合适。

## 自定义 Preset 策略

如果你的项目现在是多个老插件混着用，更建议在业务里沉淀一个自己的 preset group：

```ts
import { definePresetGroup } from 'postcss-rule-unit-converter'

export const appPresetGroup = definePresetGroup((options = {}) => {
  return [
    // rem -> rpx
    // px -> rpx
    // vw -> px
  ]
})
```

这样项目侧的规则会集中在一个地方维护，而不是分散在多个插件包里。
