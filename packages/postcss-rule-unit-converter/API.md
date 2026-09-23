# API Reference

Reference for `postcss-rule-unit-converter`.

- Overview examples: [README.md](./README.md)
- Scenario recipes: [COOKBOOK.md](./COOKBOOK.md)
- Preset authoring: [PRESET_AUTHORING.md](./PRESET_AUTHORING.md)

## Plugin

```ts
import unitConverter from 'postcss-rule-unit-converter'
```

```ts
type PostcssUnitConverter = PluginCreator<UserDefinedOptions>
```

## Options

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

- `rules`: ordered conversion rules. First match wins.
- `unitRegex`: override the generated matching regex.
- `unitPrecision`: decimal precision for generated values.
- `minValue`: global minimum source value to convert.
- `keepZeroUnit`: keep `0px`/`0rem` style output instead of collapsing to bare `0`.
- `selectorBlackList`: skip matching selectors.
- `propList`: restrict processing to matching properties. Supports negated
  string entries like `!font-size`, `!padding*`, and `!--wot-*-font-size`.
- `replace`: replace the original declaration instead of cloning a fallback declaration.
- `mediaQuery`: also convert matching units in `@media` params.
- `exclude`: skip files by path or predicate.
- `disabled`: no-op mode.

### Choosing Between `exclude`, `selectorBlackList`, and `propList`

- `exclude`: skip the whole file before any declaration is processed
- `selectorBlackList`: skip matching selectors inside an otherwise processed file
- `propList`: skip or include specific CSS properties inside matched selectors

Use `exclude` for file-level boundaries such as `node_modules` or generated CSS.
Use `selectorBlackList` when a rule or component should be left untouched. Use
`propList` when the file and selector should still be processed, but some
properties such as `font-size` or `--wot-*-font-size` should be skipped.

## Rules

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

- `from`: source unit matcher.
- `to`: fallback output unit.
- `factor`: shorthand numeric conversion.
- `minValue`: per-rule minimum source value override.
- `transform`: full callback when `factor` is not enough.

Rules are evaluated in array order. If multiple rules can match the same source unit, the first matching rule is used.

String unit matchers are trimmed and normalized to lowercase. With the default
generated regex, a string matcher such as `'px'` matches lowercase `px` in CSS.
Use a `RegExp` matcher such as `/^px$/i`, or a custom `unitRegex` that captures
uppercase units, when you need `PX`/`Px` style matches. `rawUnit` still exposes
the original casing.

## Transform Callback

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

- Return `number` to reuse `to` as the output unit.
- Return `{ value, unit }` to override the output unit.
- Return `undefined` to leave the original match unchanged.

## RuleContext

`RuleContext` extends the shared replace context from `postcss-plugin-shared`.

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

- `fromUnit`: source unit used for rule matching. It is normalized to lowercase
  when the plugin uses a custom or broad unit regex.
- `rawUnit`: original matched unit text, preserving source casing such as `PX`.
- `rawValue`: original matched numeric text before `Number(...)`, such as `.5`.
- `match`: full matched fragment, such as `.5PX`.

The default generated regex also contains skip alternatives for quoted strings,
`url(...)`, and `var(...)`. Those alternatives do not provide numeric/unit
capture groups, so the replacer returns the original text unchanged. If you pass
`unitRegex`, it replaces the generated regex entirely; include your own skip
alternatives if you still want strings, URLs, or CSS variables to remain untouched.
The expression must expose the numeric value as capture group 1 and the unit as
capture group 2. A missing global flag is added automatically so every match in
a declaration is visited.

## Helpers

```ts
function composeRules(...groups: RuleGroup[]): ConversionRule[]
```

Flatten preset groups and individual rules into one ordered rule array.

```ts
function definePreset<TOptions extends PresetOptions = undefined>(
  factory: (options?: TOptions) => ConversionRule,
): PresetFactory<TOptions>

function definePresetGroup<TOptions extends PresetOptions = undefined>(
  factory: (options?: TOptions) => ConversionRule[],
): PresetGroupFactory<TOptions>
```

Use these helpers when authoring reusable presets in app code or other packages.

## Exported Types

```ts
type PresetFactory<TOptions extends PresetOptions = undefined> = (
  options?: TOptions,
) => ConversionRule

type PresetGroupFactory<TOptions extends PresetOptions = undefined> = (
  options?: TOptions,
) => ConversionRule[]
```

Also exported:

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

`presets.unitsToPx()` keeps the default `rem/em/vw/vh/vmin/vmax/rpx -> px`
map. Object `unitMap` values are merged over those defaults. `Map` and array
forms preserve user order and do not merge defaults. A unit rule of `false`
skips that unit; `null` or runtime `undefined` falls back to
`transform(value, unit, context)`.

## Built-in Presets

Single-rule presets:

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

Grouped presets:

- `presets.pxPresetGroup()`
- `presets.rpxPresetGroup()`
- `presets.viewportPresetGroup()`
- `presets.webPresetGroup()`
- `presets.unitsToPx()`
