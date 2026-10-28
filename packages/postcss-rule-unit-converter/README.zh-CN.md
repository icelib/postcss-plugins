# postcss-rule-unit-converter

基于规则的通用 PostCSS 单位转换插件。

- 场景示例文档：[COOKBOOK.zh-CN.md](./COOKBOOK.zh-CN.md)
- API 文档：[API.zh-CN.md](./API.zh-CN.md)
- 迁移文档：[MIGRATION.zh-CN.md](./MIGRATION.zh-CN.md)
- Preset 编写指南：[PRESET_AUTHORING.zh-CN.md](./PRESET_AUTHORING.zh-CN.md)

## 特性

- 一个插件统一处理 `rpx`、`px`、`rem`、`vw`、`vh` 以及自定义单位
- 按规则顺序匹配转换
- 内置常见单位的双向 preset
- 复用仓库里现有的属性过滤、选择器黑名单、文件排除等能力
- 同时支持单个 preset 和按场景封装好的 preset group

## 心智模型

- 每条规则负责匹配一种源单位并生成一个新值。
- 规则按顺序执行。
- 如果多条规则都能命中同一个源单位，先写的那条优先；即使它的 transform 返回 `undefined`，也不会继续尝试后面的规则。
- 每轮只转换原始 token 一次，不把生成的单位交给后续规则连锁转换。再次运行插件时，仍可能转换上次的输出。
- 需要组合多组 preset 和自定义规则时，用 `composeRules(...)` 明确最终顺序。

## 运行环境

需要 Node.js 20.19.0 或更高版本，以及 PostCSS 8。

## 用法

```ts
import postcss from 'postcss'
import unitConverter, { composeRules, presets } from 'postcss-rule-unit-converter'

const result = await postcss([
  unitConverter({
    rules: composeRules(
      presets.remToViewport({ viewportWidth: 375 }),
      presets.pxToRem({ rootValue: 16 }),
    ),
  }),
]).process('.title{font-size:1rem;margin:16px}', { from: undefined })
```

## 分组 Preset

```ts
import postcss from 'postcss'
import unitConverter, { composeRules, presets } from 'postcss-rule-unit-converter'

const result = await postcss([
  unitConverter({
    rules: composeRules(
      presets.rpxPresetGroup({
        ratio: 2,
        rootValue: 16,
        viewportWidth: 375,
        viewportHeight: 667,
      }),
      {
        from: 'em',
        to: 'rpx',
        factor: 32,
      },
    ),
  }),
]).process('.demo{font-size:32rpx;left:10vw}', { from: undefined })
```

内置的分组 preset：

- `presets.rpxPresetGroup()` 把 `px/rem/vw/vh` 归一成 `rpx`
- `presets.pxPresetGroup()` 把 `rem/rpx/vw/vh` 归一成 `px`
- `presets.viewportPresetGroup()` 把 `px/rem/rpx` 归一成单一目标轴的 `vw` 或 `vh`
- `presets.webPresetGroup()` 提供一组偏 Web 场景的 `px/rem/vw/vh/rpx` 常用规则

## 从 `postcss-units-to-px` 迁移

`presets.unitsToPx()` 支持和 `postcss-units-to-px` 同形状的 `unitMap`：

```ts
import postcss from 'postcss'
import unitConverter, { presets } from 'postcss-rule-unit-converter'

const result = await postcss([
  unitConverter({
    propList: ['*'],
    rules: presets.unitsToPx({
      unitMap: {
        rem: 16,
        vw: false,
        foo: null,
      },
      transform(value, unit, context) {
        return unit === 'foo' && context.prop === 'margin' ? value * 10 : undefined
      },
    }),
  }),
]).process('.demo{font-size:1rem;width:1vw;margin:2foo}', { from: undefined })
```

对象形式的 `unitMap` 会覆盖并合并默认的 `rem/em/vw/vh/vmin/vmax/rpx`
映射。`Map` 和数组形式会保留用户传入顺序，并且不合并默认值。单个单位规则为
`false` 时跳过该单位；为 `null` 时走 `transform(value, unit, context)` 兜底。

## 更多示例

```ts
import postcss from 'postcss'
import unitConverter, { presets } from 'postcss-rule-unit-converter'

const result = await postcss([
  unitConverter({
    rules: [
      presets.rpxToPx(),
      presets.pxToRpx(),
      presets.rpxToRem({ rootValue: 16 }),
      presets.rpxToVw({ viewportWidth: 375 }),
      presets.rpxToVh({ viewportHeight: 667 }),
      presets.vwToPx({ viewportWidth: 375 }),
      presets.vhToPx({ viewportHeight: 667 }),
    ],
  }),
]).process('.demo{font-size:32rpx;width:10vw;height:10vh}', { from: undefined })
```

## 自定义 Preset

单条 preset，自带导出的类型：

```ts
import type { PresetFactory, RemBasedPresetOptions } from 'postcss-rule-unit-converter'
import postcss from 'postcss'
import unitConverter, {
  definePreset

} from 'postcss-rule-unit-converter'

const remToDp: PresetFactory<RemBasedPresetOptions> = definePreset((options = {}) => {
  const { rootValue = 16, minValue, to = 'dp' } = options
  return {
    from: 'rem',
    to,
    minValue,
    transform: (value, context) => {
      const resolvedRootValue = typeof rootValue === 'function'
        ? rootValue(context.input)
        : rootValue
      return value * resolvedRootValue
    },
  }
})

const result = await postcss([
  unitConverter({
    rules: [remToDp({ rootValue: 20 })],
  }),
]).process('.demo{font-size:1rem}', { from: undefined })
```

分组 preset，自带导出的类型：

```ts
import type { PresetGroupFactory, RemBasedPresetOptions } from 'postcss-rule-unit-converter'
import postcss from 'postcss'
import unitConverter, {
  definePresetGroup

} from 'postcss-rule-unit-converter'

type MyPresetOptions = RemBasedPresetOptions & {
  ratio?: number
}

const mobilePresetGroup: PresetGroupFactory<MyPresetOptions> = definePresetGroup((options = {}) => {
  const { rootValue = 16, ratio = 2 } = options
  return [
    {
      from: 'rem',
      to: 'rpx',
      transform: (value, context) => {
        const resolvedRootValue = typeof rootValue === 'function'
          ? rootValue(context.input)
          : rootValue
        return value * resolvedRootValue * ratio
      },
    },
    {
      from: 'px',
      to: 'rpx',
      factor: ratio,
    },
  ]
})

const result = await postcss([
  unitConverter({
    rules: mobilePresetGroup({ rootValue: 16, ratio: 2 }),
  }),
]).process('.demo{font-size:1rem;margin:16px}', { from: undefined })
```

自定义 transform 规则：

```ts
import postcss from 'postcss'
import unitConverter from 'postcss-rule-unit-converter'

const result = await postcss([
  unitConverter({
    rules: [
      {
        from: /^x$/,
        to: 'px',
        transform(value, context) {
          return context.prop === 'letter-spacing' ? value * 4 : value * 8
        },
      },
    ],
  }),
]).process('.demo{letter-spacing:2x;margin:2x}', { from: undefined })
```

## 使用建议

- 想保留兜底声明时，用 `replace: false`。
- 想避免多条 preset 对同一源单位发生竞争时，用 `propList` 把适用范围收窄。
- 项目里如果有一个主单位体系，优先使用 preset group。
- 如果你要严格控制命中顺序，优先直接写显式规则数组。
- 使用 `presets.viewportPresetGroup()` 时，建议显式指定 `viewportUnit: 'vw'` 或 `viewportUnit: 'vh'`。
- 在业务里沉淀可复用 preset 时，优先使用 `definePreset(...)` 和 `definePresetGroup(...)`。
- `RuleContext.fromUnit` 是归一化为小写的源单位（默认 tokenizer 还会解码转义）；`rawUnit` 保留原始大小写与转义；`rawValue` 是 `Number(...)` 前带符号的数字文本；`match` 是完整匹配片段。
- 开启 `transformVarFallbacks: true` 可安全转换 `var()` fallback 内的长度，默认 `false`；只有需要完全自定义匹配时才使用 `unitRegex`。
- 如果你想直接抄场景配置，优先看 cookbook。

## 匹配与处理边界

默认使用 CSS tokenizer 匹配。字符串单位 matcher 会先 trim 并归一化为小写，
因此 `'px'` 能匹配 `px`、`PX` 及等价的 CSS 转义写法。带符号数字和科学计数法
按完整数值解析。`rem` 规则不会误改 `2remfoo` 的 `remfoo` 单位，也不会误改
`foo2rem` 这样的标识符。字符串和 URL 保持原样，包括转义引号和大写 `URL()`。
默认完整跳过任意嵌套深度的 `var()`；`calc()`、`min()` 等其他函数里的长度仍可转换。
开启 `transformVarFallbacks: true` 后转换直属第一个逗号之后的 fallback，保护变量名、
字符串和 URL；不解析变量、不选择 fallback，未闭合的 `var()` 保持原文。显式
`unitRegex` 始终完整覆盖 tokenizer，此时 fallback 选项不参与处理。

回调收到真实带符号数值：`-2rem` 传入 `-2`，`1e3rem` 传入 `1000`。
全局与单规则的 `minValue` 都按源值绝对值比较，例如 `minValue: 2` 会转换
`2rem` 和 `-2rem`，保留 `1rem`。

显式 `unitRegex` 会完全绕过 tokenizer。数字必须放在第 1 个捕获组，单位放在
第 2 个捕获组；缺少的 `g` 标志会自动补上。这个路径上的 token 边界、带符号数字、
科学计数法，以及字符串、URL、`var()` 保护均由自定义正则负责。详见
[API.zh-CN.md](./API.zh-CN.md)。

`exclude`、`context.input` 和 `context.filePath` 指向根 CSS 入口，即使 importer
已将其他文件展开进来。需要按导入声明的原文件处理时，在 transform 中读取
`context.decl?.source?.input.file`。`replace: false` 的 fallback 去重同时比较
属性、值和 `!important`，不会把优先级不同的声明当作重复项。

## Presets

自定义 preset 辅助类型：

- `definePreset()`
- `definePresetGroup()`
- `type PresetFactory<TOptions>`
- `type PresetGroupFactory<TOptions>`

- `presets.remToPx()`
- `presets.remToRpx()`
- `presets.remToRpxRatio()`
- `presets.remToRpxByRatio()`
- `presets.remToResponsivePixel()`
- `presets.remToViewport()`
- `presets.remToVw()`
- `presets.remToVh()`
- `presets.pxToRem()`
- `presets.pxToViewport()`
- `presets.pxToVw()`
- `presets.pxToVh()`
- `presets.pxToRpx()`
- `presets.rpxToPx()`
- `presets.rpxToRem()`
- `presets.rpxToVw()`
- `presets.rpxToVh()`
- `presets.vwToPx()`
- `presets.vhToPx()`
- `presets.vwToRem()`
- `presets.vhToRem()`
- `presets.vwToRpx()`
- `presets.vhToRpx()`
- `presets.pxPresetGroup()`
- `presets.rpxPresetGroup()`
- `presets.viewportPresetGroup()`
- `presets.webPresetGroup()`
- `presets.unitsToPx()`
