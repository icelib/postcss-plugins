# API Reference

`postcss-rule-unit-converter` 的 API 参考。

- 总览与快速上手：[README.zh-CN.md](./README.zh-CN.md)
- 场景化示例：[COOKBOOK.zh-CN.md](./COOKBOOK.zh-CN.md)
- Preset 编写指南：[PRESET_AUTHORING.zh-CN.md](./PRESET_AUTHORING.zh-CN.md)

## 插件入口

```ts
import unitConverter from 'postcss-rule-unit-converter'
```

```ts
type PostcssUnitConverter = PluginCreator<UserDefinedOptions>
```

## 配置项

```ts
interface UserDefinedOptions {
  rules?: readonly ConversionRule[]
  unitRegex?: RegExp
  unitPrecision?: number
  minValue?: number
  keepZeroUnit?: boolean
  selectorBlackList?: readonly (string | RegExp)[]
  propList?: readonly (string | RegExp)[]
  replace?: boolean
  mediaQuery?: boolean
  exclude?: readonly (string | RegExp)[] | ((filePath: string) => boolean)
  disabled?: boolean
}
```

- `rules`：有序转换规则，先命中的先生效。
- `unitRegex`：覆盖插件自动生成的匹配正则。
- `unitPrecision`：输出值的小数精度。
- `minValue`：全局最小转换阈值。
- `keepZeroUnit`：保留 `0px`、`0rem` 这类带单位的零值输出，而不是折叠成裸 `0`。
- `selectorBlackList`：命中这些选择器时跳过。
- `propList`：仅处理匹配的属性。支持 `!font-size`、`!padding*`、
  `!--wot-*-font-size` 这类取反 / glob 写法。
- `replace`：是否直接替换原声明；否则追加 fallback。
- `mediaQuery`：是否处理 `@media` 参数中的单位。
- `exclude`：按文件路径或 predicate 跳过整文件。
- `disabled`：禁用插件。

### `exclude`、`selectorBlackList`、`propList` 怎么选

- `exclude`：文件级跳过，命中后整个文件都不处理
- `selectorBlackList`：选择器级跳过，文件仍会继续处理
- `propList`：属性级控制，在命中的规则里决定哪些属性处理、哪些属性跳过

适合用 `exclude` 的场景是 `node_modules`、生成产物、整类文件不想处理。
适合用 `selectorBlackList` 的场景是某些组件或规则整体保留原样。适合用
`propList` 的场景是文件和选择器仍然需要处理，但像 `font-size` 或
`--wot-*-font-size` 这样的属性需要跳过。

## 规则类型

```ts
type UnitMatcher = string | RegExp | ((unit: string) => boolean)

interface ConversionRule {
  from: UnitMatcher
  to?: string
  factor?: number
  minValue?: number
  transform?: RuleTransform
}
```

- `from`：源单位匹配器。
- `to`：默认输出单位。
- `factor`：简单倍率转换写法。
- `minValue`：单条规则自己的最小转换阈值，会覆盖全局 `minValue`。
- `transform`：需要完整自定义逻辑时使用。

规则按数组顺序执行。如果多条规则都能命中同一个源单位，只有第一条会生效。

字符串单位 matcher 会先 trim 并归一化为小写。使用默认自动生成的正则时，
`'px'` 这类字符串 matcher 匹配 CSS 中的小写 `px`。如果需要匹配 `PX`/`Px`
这类大小写形式，请使用 `/^px$/i` 这样的正则 matcher，或传入能捕获大写单位的
自定义 `unitRegex`。原始大小写仍可通过 `rawUnit` 读取。

## transform 回调

```ts
type RuleTransform = (
  value: number,
  context: RuleContext,
) => number | ConvertedValue | undefined

interface ConvertedValue {
  value: number
  unit?: string
}
```

- 返回 `number`：沿用 `to` 作为输出单位。
- 返回 `{ value, unit }`：同时自定义输出值和输出单位。
- 返回 `undefined`：保持原始匹配结果不变。

## RuleContext

`RuleContext` 基于 `postcss-plugin-shared` 的 replace context 扩展而来。

```ts
interface RuleContext {
  root: Root
  input: Input
  filePath?: string
  decl?: Declaration
  rule?: Rule
  atRule?: AtRule
  prop?: string
  selector?: string
  fromUnit: string
  rawUnit: string
  rawValue: string
  match: string
}
```

- `fromUnit`：用于规则匹配的源单位。插件使用自定义或宽泛单位正则时会归一化为小写。
- `rawUnit`：原始匹配到的单位文本，会保留 `PX` 这类大小写。
- `rawValue`：`Number(...)` 之前的原始数字文本，例如 `.5`。
- `match`：完整匹配片段，例如 `.5PX`。

默认自动生成的正则还包含对字符串、`url(...)` 和 `var(...)` 的跳过分支。
这些分支不会提供数字 / 单位捕获组，因此 replacer 会原样返回。传入
`unitRegex` 时会完全替换默认正则；如果仍希望跳过字符串、URL 或 CSS 变量，
需要在自定义正则里保留对应跳过分支。正则必须把数字放在第 1 个捕获组、
单位放在第 2 个捕获组；如果没有 `g` 标志，插件会自动补上，确保声明中的
每个匹配项都会处理。

## 辅助函数

```ts
function composeRules(...groups: RuleGroup[]): ConversionRule[]
```

把 preset group 和单条规则拍平成一个最终有序规则数组。

```ts
function definePreset<TOptions extends PresetOptions = undefined>(
  factory: (options?: TOptions) => ConversionRule,
): PresetFactory<TOptions>

function definePresetGroup<TOptions extends PresetOptions = undefined>(
  factory: (options?: TOptions) => ConversionRule[],
): PresetGroupFactory<TOptions>
```

在业务侧或其他包里封装可复用 preset 时，优先使用这两个 helper。

## 导出的类型

```ts
type PresetFactory<TOptions extends PresetOptions = undefined> = (
  options?: TOptions,
) => ConversionRule

type PresetGroupFactory<TOptions extends PresetOptions = undefined> = (
  options?: TOptions,
) => ConversionRule[]
```

另外还会导出：

- `ConversionRule`
- `ConvertedValue`
- `GlobalUnitTransform`
- `RuleContext`
- `RuleGroup`
- `RuleTransform`
- `UnitMap`
- `UnitMatcher`
- `UnitRule`
- `UnitTransform`
- `PostcssUnitConverter`

## `presets.unitsToPx`

```ts
type UnitMatcher = string | RegExp | ((unit: string) => boolean)
type UnitTransform = (value: number, context: RuleContext) => number | ConvertedValue | undefined
type GlobalUnitTransform = (value: number, unit: string, context: RuleContext) => number | ConvertedValue | undefined
type UnitRule = number | UnitTransform | null | false
type UnitMap = Record<string, UnitRule> | Map<UnitMatcher, UnitRule> | Array<[UnitMatcher, UnitRule]>

interface UnitMapPresetOptions {
  minValue?: number
  unitMap?: UnitMap
  to?: string
  transform?: GlobalUnitTransform | false
}
```

`presets.unitsToPx()` 保留默认的 `rem/em/vw/vh/vmin/vmax/rpx -> px` 映射。
对象形式的 `unitMap` 会覆盖并合并默认值；`Map` 和数组形式会保留用户传入顺序，
并且不合并默认值。单个单位规则为 `false` 时跳过该单位；为 `null` 或运行时
`undefined` 时走 `transform(value, unit, context)` 兜底。

## 内置 Preset

单条规则 preset：

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

分组 preset：

- `presets.pxPresetGroup()`
- `presets.rpxPresetGroup()`
- `presets.viewportPresetGroup()`
- `presets.webPresetGroup()`
- `presets.unitsToPx()`
