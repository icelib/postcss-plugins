# Preset Authoring Guide

How to design, organize, test, and publish custom presets for `postcss-rule-unit-converter`.

- Overview: [README.md](./README.md)
- API: [API.md](./API.md)
- Migration: [MIGRATION.md](./MIGRATION.md)

## Decide The Right Shape

Use a single preset when:

- one source unit maps to one target unit
- one option object controls one conversion rule
- ordering against other rules is simple

Use a preset group when:

- one app mode needs multiple related rules
- multiple units should normalize into one target unit
- you want to ship one reusable opinionated bundle

## Authoring A Single Preset

Preset options can use named interfaces or object types without an index
signature. `PresetFactory`, `PresetGroupFactory`, `definePreset`, and
`definePresetGroup` share the `object | undefined` constraint; primitive option
types such as `number` are rejected.

```ts
import type { PresetFactory } from 'postcss-rule-unit-converter'
import { definePreset } from 'postcss-rule-unit-converter'

interface RemToDpOptions {
  rootValue?: number | ((input: import('postcss').Input) => number)
  to?: string
  minValue?: number
}

export const remToDp: PresetFactory<RemToDpOptions> = definePreset((options = {}) => {
  const { rootValue = 16, to = 'dp', minValue } = options

  return {
    from: 'rem',
    to,
    minValue,
    transform(value, context) {
      const resolvedRootValue = typeof rootValue === 'function'
        ? rootValue(context.input)
        : rootValue
      return value * resolvedRootValue
    },
  }
})
```

Guidelines:

- keep option names domain-specific
- return one `ConversionRule`
- prefer `factor` when the rule is static
- use `transform` only when you need input-aware or context-aware logic

## Authoring A Preset Group

```ts
import type { PresetGroupFactory } from 'postcss-rule-unit-converter'
import { definePresetGroup } from 'postcss-rule-unit-converter'

interface MobilePresetOptions {
  rootValue?: number
  ratio?: number
  viewportWidth?: number
}

export const mobilePresetGroup: PresetGroupFactory<MobilePresetOptions> = definePresetGroup((options = {}) => {
  const {
    rootValue = 16,
    ratio = 2,
    viewportWidth = 375,
  } = options

  return [
    {
      from: 'rem',
      to: 'rpx',
      factor: rootValue * ratio,
    },
    {
      from: 'px',
      to: 'rpx',
      factor: ratio,
    },
    {
      from: 'vw',
      to: 'rpx',
      factor: viewportWidth * ratio / 100,
    },
  ]
})
```

Guidelines:

- group rules that belong to one target system
- keep order explicit inside the returned array
- avoid mixing unrelated concerns into one group

## Option Design

Prefer options that reflect conversion intent:

- `rootValue`
- `viewportWidth`
- `viewportHeight`
- `ratio`
- `to`
- `minValue`

Avoid leaking implementation details into public options unless users truly need them.

## Context-Aware Rules

Use `RuleContext` when behavior depends on:

- current file path
- current property name
- current selector
- original unit casing
- exact matched source text

Example:

```ts
const rule = {
  transform(value, context) {
    if (context.prop === 'letter-spacing') {
      return value * 2
    }

    if (context.rawUnit === 'PX') {
      return {
        value,
        unit: 'ch',
      }
    }

    return value
  },
}
```

Callbacks receive signed values, including scientific notation. Do not add a
second sign to negative inputs. `minValue` is an absolute-magnitude threshold.
`context.input` and `context.filePath` identify the root entry; use
`context.decl?.source?.input.file` when an imported declaration's origin matters.
See [matching boundaries](./API.md#matching-boundaries) for the default tokenizer
and the explicit `unitRegex` escape hatch.

## File Organization

Recommended package layout:

```text
src/
  presets/
    rem.ts
    viewport.ts
    mobile.ts
  index.ts
  presets.ts
test/
  rem.test.ts
  mobile.test.ts
```

Recommended export shape:

```ts
export { mobilePresetGroup } from './presets/mobile'
export { remToDp } from './presets/rem'
```

Keep preset definitions in focused modules instead of one large file once the preset count grows.

## Testing Strategy

Test presets at the plugin boundary, not only as raw objects.

```ts
import postcss from 'postcss'
import unitConverter from 'postcss-rule-unit-converter'
import { remToDp } from '../src/presets/rem'

it('converts rem to dp', () => {
  const result = postcss([
    unitConverter({
      rules: [remToDp({ rootValue: 20 })],
    }),
  ]).process('.rule{font-size:1rem}', { from: undefined }).css

  expect(result).toBe('.rule{font-size:20dp}')
})
```

Recommended coverage:

- default options
- custom options
- rule ordering
- `propList` / selector blacklist interaction
- dynamic `input`-based options
- raw match context branches
- signed/scientific values, zero, and absolute `minValue` thresholds
- complete unit boundaries, strings/URLs, and deeply nested `var()` fallbacks
- repeated processing when output units can match another rule

## Composition Strategy

Use `composeRules(...)` when app code mixes:

- your local preset groups
- built-in presets
- one-off rules

Example:

```ts
unitConverter({
  rules: composeRules(
    mobilePresetGroup({ ratio: 2 }),
    {
      from: 'em',
      to: 'rpx',
      factor: 32,
    },
  ),
})
```

## Publishing Strategy

If presets are app-specific:

- keep them in your app config package
- export them from one local module

If presets are reused across multiple projects:

- publish a small wrapper package
- export typed preset factories
- keep tests close to presets

## Common Mistakes

- relying on implicit rule order
- mixing unrelated conversions in one preset group
- exposing too many low-level options too early
- testing the raw preset object but not the real plugin output
- forgetting that first match wins

## Rule Of Thumb

- use one preset for one conversion idea
- use one preset group for one target unit system
- use app code to compose groups, not to re-implement conversions repeatedly
