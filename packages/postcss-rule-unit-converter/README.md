# postcss-rule-unit-converter

Rule-driven PostCSS unit conversion plugin.

- Cookbook: [COOKBOOK.md](./COOKBOOK.md)
- API Reference: [API.md](./API.md)
- Migration Guide: [MIGRATION.md](./MIGRATION.md)
- Preset Authoring: [PRESET_AUTHORING.md](./PRESET_AUTHORING.md)

## Features

- One plugin for `rpx`, `px`, `rem`, `vw`, `vh`, and custom unit transforms
- Order-based matching rules
- Built-in common presets for two-way conversion between common units
- Reuses the same filtering options as the other packages in this monorepo
- Supports single presets and grouped preset collections for common workflows

## Mental Model

- Each rule matches a source unit and produces a next value.
- Rules are evaluated in order.
- If two rules can match the same source unit, the first matching rule wins, even if its transform returns `undefined`.
- Each source token is converted once per processing run; a generated unit is not passed to later rules. Running the plugin again may convert that output.
- Use `composeRules(...)` when you want to merge multiple preset groups and custom rules into one ordered rule list.

## Runtime Requirements

Node.js 20.19.0 or newer and PostCSS 8 are required.

## Usage

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

## Grouped Presets

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

Available grouped presets:

- `presets.rpxPresetGroup()` normalizes `px/rem/vw/vh` into `rpx`
- `presets.pxPresetGroup()` normalizes `rem/rpx/vw/vh` into `px`
- `presets.viewportPresetGroup()` normalizes `px/rem/rpx` into either `vw` or `vh`
- `presets.webPresetGroup()` bundles common `px/rem/vw/vh/rpx` web-style conversions

## Migrating From `postcss-units-to-px`

`presets.unitsToPx()` accepts the same `unitMap` shapes used by
`postcss-units-to-px`:

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

Object `unitMap` values merge over the default `rem/em/vw/vh/vmin/vmax/rpx`
map. `Map` and array `unitMap` values preserve your matcher order and do not
merge defaults. Use `false` to skip a unit and `null` to fall back to
`transform(value, unit, context)`.

## More Examples

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

## Custom Presets

Single preset with exported types:

```ts
import type { PresetFactory, RemBasedPresetOptions } from 'postcss-rule-unit-converter'
import postcss from 'postcss'
import unitConverter, { definePreset } from 'postcss-rule-unit-converter'

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

Grouped preset with exported types:

```ts
import type { PresetGroupFactory, RemBasedPresetOptions } from 'postcss-rule-unit-converter'
import postcss from 'postcss'
import unitConverter, { definePresetGroup } from 'postcss-rule-unit-converter'

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

Custom transform rule:

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

Raw match context for advanced transforms:

```ts
import postcss from 'postcss'
import unitConverter from 'postcss-rule-unit-converter'

const result = await postcss([
  unitConverter({
    rules: [
      {
        from: /^(px)$/i,
        to: 'px',
        transform(value, context) {
          if (context.rawUnit === 'PX') {
            return {
              value,
              unit: 'ch',
            }
          }

          return Number(context.rawValue) / 2
        },
      },
    ],
  }),
]).process('.demo{width:40PX;height:40px}', { from: undefined })
```

`RuleContext` extends the shared replace context and also exposes:

- `fromUnit`: lowercase source unit for rule matching; default tokenization also decodes CSS escapes
- `rawUnit`: original unit text before decoding and normalization, for example `PX` or a CSS-escaped spelling
- `rawValue`: original signed numeric text before `Number(...)`, for example `-2` or `1e3`
- `match`: full matched fragment, for example `40PX`

Advanced matching options:

- `transformVarFallbacks`: opt into converting `var()` fallback dimensions while protecting the variable name, strings, and URLs (default `false`)
- `unitRegex`: replace default tokenization with your own matching regex; this remains authoritative even with `transformVarFallbacks: true`
- `keepZeroUnit`: keep `0px`, `0rem`, or custom zero outputs instead of collapsing them to bare `0`

## Matching And Processing Boundaries

Default matching uses CSS tokens. String unit matchers are trimmed and normalized
to lowercase, so `'px'` matches `px`, `PX`, and equivalent CSS-escaped units.
Signed numbers and scientific notation are parsed as complete values. A rule for
`rem` does not match the unit `remfoo` in `2remfoo` or the identifier `foo2rem`.
Strings and URLs remain untouched, including escaped quotes and uppercase `URL()`.
The entire `var()` function is skipped at every nesting depth; other functions
such as `calc()` and `min()` can contain convertible dimensions. Set
`transformVarFallbacks: true` to convert fallback dimensions at any depth without
resolving the variable or choosing a fallback. An unclosed `var()` stays unchanged.

Callbacks receive the signed value: `-2rem` passes `-2`, and `1e3rem` passes
`1000`. Global and per-rule `minValue` compare the absolute source magnitude, so
`minValue: 2` permits both `2rem` and `-2rem` while leaving `1rem` unchanged.

An explicit `unitRegex` bypasses tokenization completely. It must capture the
numeric value in group 1 and the unit in group 2; a missing global flag is added.
You are responsible for token boundaries, signed/scientific numbers, and any
string, URL, or `var()` protection on that custom path. See [API.md](./API.md).

`exclude`, `context.input`, and `context.filePath` refer to the root CSS entry,
including when an importer has expanded other files into it. For decisions based
on an imported declaration's own source, inspect `context.decl?.source?.input.file`
in a transform callback. With `replace: false`, fallback deduplication compares
property, value, and `!important`, preserving declarations with different priority.

## Rule Tips

- Use `replace: false` when you want to keep fallback declarations beside converted values.
- Use `propList` to keep different presets from competing on the same source unit in unrelated properties.
- Prefer grouped presets when your project has one main unit system.
- Prefer explicit custom rule arrays when you need tight control over rule order.
- For `presets.viewportPresetGroup()`, choose `viewportUnit: 'vw'` or `viewportUnit: 'vh'` explicitly when you want one axis.
- Prefer `definePreset(...)` and `definePresetGroup(...)` when authoring reusable presets in your own package or app config.
- Use `RuleContext.rawUnit`, `RuleContext.rawValue`, and `RuleContext.match` when your transform depends on original casing or exact matched text.
- Use `transformVarFallbacks: true` to convert fallback lengths safely; reserve `unitRegex` for custom matching semantics.
- Use `keepZeroUnit` when downstream tooling expects `0` to keep its explicit unit.
- If you want more scenario-based examples, see the cookbook.

## Presets

Custom preset authoring helpers:

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
