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
  transformVarFallbacks?: boolean
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
- `unitRegex`：关闭默认 CSS tokenizer，改用自定义正则匹配。
- `transformVarFallbacks`：转换 `var()` 直属第一个逗号之后的 fallback，默认 `false`；显式 `unitRegex` 优先，此时该选项不参与处理。
- `unitPrecision`：输出值的小数精度。
- `minValue`：全局源值绝对值阈值，默认 `0`；负长度也可转换。
- `keepZeroUnit`：保留 `0px`、`0rem` 这类带单位的零值输出，而不是折叠成裸 `0`。
- `selectorBlackList`：命中这些选择器时跳过。
- `propList`：仅处理匹配的属性。支持 `!font-size`、`!padding*`、
  `!--wot-*-font-size` 这类取反 / glob 写法。
- `replace`：是否直接替换原声明，默认 `true`；否则追加 fallback，按属性、值与 `!important` 去重。
- `mediaQuery`：是否处理 `@media` 参数中的单位。
- `exclude`：按路径或 predicate 跳过整个根入口，默认 `[/node_modules/i]`；不会按导入声明的原文件过滤。
- `disabled`：禁用插件。

### `exclude`、`selectorBlackList`、`propList` 怎么选

- `exclude`：文件级跳过，命中后整个文件都不处理
- `selectorBlackList`：选择器级跳过，文件仍会继续处理
- `propList`：属性级控制，在命中的规则里决定哪些属性处理、哪些属性跳过

适合用 `exclude` 的场景是 `node_modules`、生成产物、整类根入口不想处理。
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
- `minValue`：单条规则的源值绝对值阈值，会覆盖全局 `minValue`。
- `transform`：需要完整自定义逻辑时使用。

规则按数组顺序执行，第一条命中的规则即为最终选择。即使它的 `transform`
返回 `undefined`，或源值未达到它的 `minValue`，也不会改用后面的规则。
每轮只转换原始 token 一次；`rem -> px` 后跟 `px -> rpx` 不会在同一轮连锁执行。
再次处理时可能继续转换生成的 `px`，只想换算一次时应只配置一个转换阶段。

字符串单位 matcher 会先 trim 并归一化为小写。默认 tokenizer 会解码 CSS 单位
转义并归一化大小写，因此 `'px'` 也能匹配 `PX`、`Px` 及等价转义写法。
正则与函数 matcher 接收到的也是归一化后的单位，`rawUnit` 保留原始文本。

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
- 返回 `undefined`：保持原始匹配结果不变，不再尝试后续规则。

`value` 带有真实符号，并支持科学计数法：`-2rem` 传入 `-2`，`1e3rem`
传入 `1000`。调用回调前，`minValue` 按 `Math.abs(value)` 比较。

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

- `fromUnit`：用于规则匹配的小写源单位；默认 tokenizer 还会解码 CSS 转义。
- `rawUnit`：原始单位文本，保留 `PX` 这样的大小写与 CSS 转义。
- `rawValue`：`Number(...)` 前带符号的数字文本，例如 `-.5` 或 `1e3`。
- `match`：完整匹配片段，例如 `-.5PX`。
- `input` 和 `filePath`：根入口的输入与路径，即使已展开其他 CSS 文件。声明的原文件可通过 `decl?.source?.input.file` 获取；处理媒体查询参数时没有 `decl`。

支持没有根源码信息的手工 AST。回调和过滤上下文使用临时 `Input`，包含转换前
的 AST 文本及显式传入的 `process({ from })`。它不会给节点附加源码信息，也
不会为没有路径的输入伪造文件名。

## 匹配边界

不配置 `unitRegex` 时，CSS tokenizer 遍历完整的 dimension 和百分比 token。
`rem` 规则不会误改 `2remfoo` 或 `foo2rem`。符号、科学计数法、单位大小写和
CSS 转义都按 CSS token 边界处理。字符串、注释与 URL 内容保持不变，包括
转义引号和大写 `URL()`。默认完整跳过任意嵌套深度的 `var()` 及其 fallback；
`calc()`、`min()` 等其他函数中的长度正常转换。

开启 `transformVarFallbacks: true` 后递归转换 fallback 中的长度，仍保留变量名、
字符串和 URL；不解析变量、不选择 fallback。未闭合的 `var()` 保持原文，
不会触发其中的转换回调。

显式 `unitRegex` 会完全替代 tokenizer 及上述保护。正则必须把数字放在第 1 个
捕获组、单位放在第 2 个捕获组；缺少 `g` 标志时会自动补上，确保每个匹配项都会
处理。捕获到的单位会转成小写用于规则匹配；转义、带符号数字、科学计数法、
token 边界及字符串、URL、`var()` 跳过逻辑由自定义正则负责。

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
