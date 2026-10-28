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

- `rules`: ordered conversion rules. First match wins.
- `unitRegex`: opt out of default CSS tokenization and use a custom regex instead.
- `transformVarFallbacks`: convert dimensions after the first direct comma in `var()` (default `false`). Ignored when `unitRegex` is supplied.
- `unitPrecision`: decimal precision for generated values.
- `minValue`: global minimum absolute source magnitude to convert (default `0`). Negative lengths remain eligible.
- `keepZeroUnit`: keep `0px`/`0rem` style output instead of collapsing to bare `0`.
- `selectorBlackList`: skip matching selectors.
- `propList`: restrict processing to matching properties. Supports negated
  string entries like `!font-size`, `!padding*`, and `!--wot-*-font-size`.
- `replace`: replace the original declaration instead of cloning a fallback declaration (default `true`). Fallback deduplication compares property, value, and `!important`.
- `mediaQuery`: also convert matching units in `@media` params.
- `exclude`: skip the entire root entry by path or predicate (default `[/node_modules/i]`). It does not filter imported declarations by their original file.
- `disabled`: no-op mode.

### Choosing Between `exclude`, `selectorBlackList`, and `propList`

- `exclude`: skip the whole file before any declaration is processed
- `selectorBlackList`: skip matching selectors inside an otherwise processed file
- `propList`: skip or include specific CSS properties inside matched selectors

Use `exclude` for root-entry boundaries such as `node_modules` or generated CSS.
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
- `minValue`: per-rule minimum absolute source magnitude, overriding the global threshold.
- `transform`: full callback when `factor` is not enough.

Rules are evaluated in array order. The first matching rule is final, including
when its `transform` returns `undefined` or its `minValue` threshold is not met.
Later rules do not retry that token. Each original token is converted once; a
`rem -> px` rule followed by a `px -> rpx` rule does not chain in one run. A second
processing run may convert the generated `px`, so configure one stage when a
single conversion is intended.

String unit matchers are trimmed and normalized to lowercase. Default tokenization
decodes CSS unit escapes and normalizes unit case, so `'px'` also matches `PX`,
`Px`, and equivalent escaped spellings. Regex and function matchers receive that
normalized unit. `rawUnit` retains the original source text.

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
- Return `undefined` to leave the original match unchanged, without trying later rules.

`value` is signed and supports scientific notation: `-2rem` passes `-2`, and
`1e3rem` passes `1000`. `minValue` compares `Math.abs(value)` before the callback.

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

- `fromUnit`: lowercase source unit used for rule matching; default tokenization also decodes CSS escapes.
- `rawUnit`: original unit text, preserving casing such as `PX` and CSS escapes.
- `rawValue`: original signed numeric text before `Number(...)`, such as `-.5` or `1e3`.
- `match`: full matched fragment, such as `-.5PX`.
- `input` and `filePath`: root-entry input and path, including when other CSS files have been imported. Inspect `decl?.source?.input.file` for a declaration's original file; `decl` is absent for media-query parameters.

Programmatic ASTs without root source metadata are supported. Their callback and
filter context uses an ephemeral `Input` containing the original AST text and
the explicit `process({ from })`, if supplied. This does not attach sources to
nodes or invent a filename for source-less input.

## Matching Boundaries

Without `unitRegex`, a CSS tokenizer visits complete dimension and percentage
tokens. A `rem` rule leaves `2remfoo` and `foo2rem` untouched. Signed values,
scientific notation, unit case, and CSS escapes follow CSS token boundaries.
Strings, comments, and URL contents remain untouched, including escaped quotes
and uppercase `URL()`. The whole `var()` function is skipped at every nesting
depth, including its fallback; lengths in other functions such as `calc()` and
`min()` are processed normally. With `transformVarFallbacks: true`, fallback
dimensions are converted recursively while the variable name, strings, and URLs
remain intact. This does not resolve variables or select their fallback. An
unclosed `var()` stays unchanged and does not call conversion callbacks.

An explicit `unitRegex` replaces tokenization entirely, including those protections.
The expression must expose the numeric value as capture group 1 and the unit as
capture group 2. A missing global flag is added automatically so every match in
a declaration is visited. Captured units are lowercased for rule matching; the
custom regex is responsible for escapes, signed/scientific numbers, token
boundaries, and any string, URL, or `var()` skip alternatives.

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
