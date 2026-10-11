# Cookbook

Practical recipes for `postcss-rule-unit-converter`.

## H5 Design Width 375 To `vw`

```ts
import unitConverter, { presets } from 'postcss-rule-unit-converter'

export default {
  plugins: [
    unitConverter({
      rules: [
        presets.remToVw({
          rootValue: 16,
          viewportWidth: 375,
        }),
      ],
    }),
  ],
}
```

Use when:

- your source styles use `rem`
- your target output should be viewport-width based
- you only want a direct `rem -> vw` conversion

## Mini Program `rem/px -> rpx`

```ts
import unitConverter, { composeRules, presets } from 'postcss-rule-unit-converter'

export default {
  plugins: [
    unitConverter({
      rules: composeRules(
        presets.rpxPresetGroup({
          rootValue: 16,
          ratio: 2,
          viewportWidth: 375,
          viewportHeight: 667,
        }),
      ),
    }),
  ],
}
```

Use when:

- your target runtime prefers `rpx`
- your source styles may contain `px`, `rem`, `vw`, or `vh`
- you want one normalized target unit

## Convert Only Typography

```ts
import unitConverter, { presets } from 'postcss-rule-unit-converter'

export default {
  plugins: [
    unitConverter({
      propList: ['font', 'font-size', 'line-height', 'letter-spacing'],
      rules: [
        presets.remToPx(),
      ],
    }),
  ],
}
```

Use when:

- spacing and layout should stay untouched
- only text-related declarations should be converted

## Keep Fallback Values

```ts
import unitConverter, { presets } from 'postcss-rule-unit-converter'

export default {
  plugins: [
    unitConverter({
      replace: false,
      rules: [
        presets.pxToRem({
          rootValue: 16,
        }),
      ],
    }),
  ],
}
```

This keeps the original declaration and appends the converted one after it.
Existing fallbacks are compared by property, value, and `!important`, so a normal
declaration does not suppress an important fallback.

## Dynamic Root Value By Entry

```ts
import unitConverter, { presets } from 'postcss-rule-unit-converter'

export default {
  plugins: [
    unitConverter({
      rules: [
        presets.remToPx({
          rootValue: input => input.file?.includes('tablet') ? 18 : 16,
        }),
      ],
    }),
  ],
}
```

Use when:

- mobile and tablet styles share one build
- different root entries need different conversion baselines

The preset resolver receives the root-entry `Input`. After an importer expands
several files, it does not switch input for each declaration. For per-source
conversion, use a rule callback and inspect the declaration source:

```ts
unitConverter({
  rules: [{
    from: 'rem',
    to: 'px',
    transform(value, context) {
      const source = context.decl?.source?.input.file ?? context.filePath
      return value * (source?.includes('tablet') ? 18 : 16)
    },
  }],
})
```

## Custom Preset In App Config

```ts
import type { PresetFactory, RemBasedPresetOptions } from 'postcss-rule-unit-converter'
import unitConverter, { definePreset } from 'postcss-rule-unit-converter'

const remToDp: PresetFactory<RemBasedPresetOptions> = definePreset((options = {}) => {
  const { rootValue = 16, minValue, to = 'dp' } = options
  return {
    from: 'rem',
    to,
    ...(minValue === undefined ? {} : { minValue }),
    transform: (value, context) => {
      const resolvedRootValue = typeof rootValue === 'function'
        ? rootValue(context.input)
        : rootValue
      return value * resolvedRootValue
    },
  }
})

export default {
  plugins: [
    unitConverter({
      rules: [remToDp()],
    }),
  ],
}
```

## Use Raw Match Context In Custom Rules

```ts
import unitConverter from 'postcss-rule-unit-converter'

export default {
  plugins: [
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
  ],
}
```

Use when:

- your transform logic depends on the original unit casing
- you need the exact matched fragment such as `40PX`
- you want access to normalized `fromUnit` and raw `rawUnit/rawValue/match` together

## Mix Group Presets With Manual Rules

```ts
import unitConverter, { composeRules, presets } from 'postcss-rule-unit-converter'

export default {
  plugins: [
    unitConverter({
      rules: composeRules(
        presets.pxPresetGroup({
          rootValue: 16,
          viewportWidth: 375,
          viewportHeight: 667,
        }),
        {
          from: 'em',
          to: 'px',
          factor: 16,
        },
      ),
    }),
  ],
}
```

Use when:

- most of the project can follow a standard preset group
- a few extra units still need local project rules
