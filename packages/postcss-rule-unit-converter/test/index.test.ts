import type { ConversionRule, UnitMatcher, UnitRule } from '../src/index'

import postcss from 'postcss'
import unitConverter, {
  composeRules,
  createUnitRegex,
  definePreset,
  definePresetGroup,
  presets,
  resolveNumericValue,
} from '../src/index'

type IsAny<T> = 0 extends (1 & T) ? true : false
type IsEqual<TActual, TExpected> = (<T>() => T extends TActual ? 1 : 2) extends
(<T>() => T extends TExpected ? 1 : 2)
  ? true
  : false
type Expect<T extends true> = T

const presetA = () => presets.unitsToPx()
const presetB = () => presets.remToPx()
const _composedRulesTypeCheck = composeRules(presetA(), [presetB()])
type ComposedRulesType = typeof _composedRulesTypeCheck
type _ComposedRulesElementIsNotAny = Expect<IsEqual<IsAny<ComposedRulesType[number]>, false>>
type _ComposedRulesReturnType = Expect<IsEqual<ComposedRulesType, ConversionRule[]>>

describe('postcss-rule-unit-converter', () => {
  it('matches longer overlapping units before shorter units', () => {
    const regex = createUnitRegex(['p', 'px'])
    const output = 'a:1px;b:2p;'.replace(regex, match => match.toUpperCase())

    expect(output).toBe('a:1PX;b:2P;')
  })

  it('converts with custom rules', () => {
    const input = '.rule { font-size: 1rem; width: 100px; }'
    const output = '.rule { font-size: 16px; width: 26.66667vw; }'
    const processed = postcss(unitConverter({
      rules: [
        presets.remToPx(),
        presets.pxToViewport(),
      ],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports rule groups from common presets', () => {
    const input = '.rule { margin: 1rem 1em 1vw 1rpx; }'
    const output = '.rule { margin: 16px 16px 3.75px 0.5px; }'
    const processed = postcss(unitConverter({
      rules: composeRules(presets.unitsToPx()),
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports postcss-units-to-px style object unit maps', () => {
    expect(presets.unitsToPx({ transform: false })).toEqual([])

    const input = '.rule { a: 1rem; b: 1vw; c: 1vh; d: 2foo; e: 3bar; f: 4baz; }'
    const output = '.rule { a: 10px; b: 1vw; c: 6.67px; d: 10px; e: 6em; f: 20px; }'
    const processed = postcss(unitConverter({
      rules: presets.unitsToPx({
        unitMap: {
          rem: 10,
          vw: false,
          foo: null,
          bar: (value, context) => context.prop === 'e'
            ? { value: value * 2, unit: 'em' }
            : { value: value * 2 },
          baz: undefined as any,
        },
        transform(value, unit, context) {
          return context.fromUnit === unit ? value * 5 : undefined
        },
      }),
      propList: ['*'],
      unitPrecision: 2,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('preserves Map and Array unit map order without merging defaults', () => {
    const input = '.rule { width: 1rem; height: 2foo; margin: 3bar; padding: 4baz; }'
    const output = '.rule { width: 1rem; height: 4px; margin: 9px; padding: 4baz; }'
    const processed = postcss(unitConverter({
      rules: presets.unitsToPx({
        unitMap: [
          [/^foo$/, 2],
          [unit => unit === 'bar', value => value * 3],
        ],
      }),
      propList: ['*'],
    })).process(input).css

    expect(processed).toBe(output)

    const orderedInput = '.rule { width: 2foo; }'
    const orderedOutput = '.rule { width: 4px; }'
    const orderedProcessed = postcss(unitConverter({
      rules: presets.unitsToPx({
        unitMap: new Map<UnitMatcher, UnitRule>([
          [/^foo$/, 2],
          ['foo', 10],
        ]),
      }),
      propList: ['*'],
    })).process(orderedInput).css

    expect(orderedProcessed).toBe(orderedOutput)
  })

  it('supports dynamic preset values based on input file', () => {
    const input = 'h1 { font-size: 1rem; }'
    const output = 'h1 { font-size: 5vw; }'
    const processed = postcss(unitConverter({
      rules: [
        presets.remToViewport({
          viewportWidth: input => input.file?.endsWith('design.css') ? 320 : 375,
        }),
      ],
    })).process(input, { from: '/src/design.css' }).css

    expect(processed).toBe(output)
  })

  it('respects replace=false, propList, mediaQuery, and selector blacklist', () => {
    const input = '@media (min-width: 375px) { .rule { font-size: 16px; margin: 16px; } .skip { font-size: 16px; } }'
    const output = '@media (min-width: 100vw) { .rule { font-size: 16px; font-size: 4.26667vw; margin: 16px; } .skip { font-size: 16px; } }'
    const processed = postcss(unitConverter({
      rules: [presets.pxToViewport()],
      propList: ['font'],
      replace: false,
      mediaQuery: true,
      selectorBlackList: ['.skip'],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports user-style glob exclusions in propList', () => {
    const input = '.rule { margin: 1rem; font-size: 1rem; line-height: 1.5rem; font: 1rem/1.5 sans-serif; --wot-color: 1rem; --wot-fs-title: 1rem; --wot-body-font-size: 1rem; --other-font-size: 1rem }'
    const output = '.rule { margin: 16px; font-size: 1rem; line-height: 1.5rem; font: 1rem/1.5 sans-serif; --wot-color: 1rem; --wot-fs-title: 1rem; --wot-body-font-size: 1rem; --other-font-size: 16px }'
    const processed = postcss(unitConverter({
      rules: [presets.remToPx()],
      propList: ['*', '!font-size', '!line-height', '!font', '!--wot-*', '!--wot-fs-*', '!--wot-*-font-size'],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('ignores quoted strings, url(), var(), and excluded files', () => {
    const input = '.rule { content: "1rem"; background: url(1rem.png); gap: var(--gap, 1rem); font-size: 1rem; }'
    const excluded = postcss(unitConverter({
      rules: [presets.remToPx()],
      exclude: ['skip.css'],
    })).process(input, { from: '/src/skip.css' }).css

    expect(excluded).toBe(input)

    const output = '.rule { content: "1rem"; background: url(1rem.png); gap: var(--gap, 1rem); font-size: 16px; }'
    const processed = postcss(unitConverter({
      rules: [presets.remToPx()],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('keeps nested var() fallbacks unchanged', () => {
    const input = '.rule { width: var(--gap, calc(1rem + 2rem)); font-size: 1rem; }'
    const output = '.rule { width: var(--gap, calc(1rem + 2rem)); font-size: 16px; }'
    const processed = postcss(unitConverter({
      rules: [presets.remToPx()],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports regex matchers and full custom transforms', () => {
    const input = '.rule { inset: 1foo 2bar; }'
    const output = '.rule { inset: 10px 2bar; }'
    const processed = postcss(unitConverter({
      rules: [
        {
          from: /^foo$/,
          to: 'px',
          transform: value => value * 10,
        },
      ],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('exposes raw match information to custom transforms', () => {
    const input = '.rule { width: 40PX; height: 40px; }'
    const output = '.rule { width: 40ch; height: 20px; }'
    const processed = postcss(unitConverter({
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

            return value / 2
          },
        },
      ],
      propList: ['width', 'height'],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports custom unitRegex overrides', () => {
    const input = '.rule { width: var(--gap, 40px); }'
    const output = '.rule { width: var(--gap, 20px); }'
    const processed = postcss(unitConverter({
      rules: [
        {
          from: 'px',
          to: 'px',
          transform: value => value / 2,
        },
      ],
      unitRegex: /"[^"]+"|'[^']+'|url\([^)]+\)|(\d+(?:\.\d+)?|\.\d+)(px)/g,
      propList: ['width'],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('normalizes non-global custom unitRegex values', () => {
    const processed = postcss(unitConverter({
      rules: [{ from: 'px', to: 'rem', factor: 2 }],
      unitRegex: /(\d+)(px)/,
      propList: ['margin'],
    })).process('.rule { margin: 1px 2px; }').css

    expect(processed).toBe('.rule { margin: 2rem 4rem; }')
  })

  it('rejects custom unitRegex values without numeric and unit captures', () => {
    expect(() => unitConverter({
      rules: [{ from: 'px', to: 'rem', factor: 2 }],
      unitRegex: /\d+px/,
    })).toThrow('unitRegex must provide numeric and unit capture groups')
  })

  it('supports custom units containing digits with complex matchers', () => {
    const processed = postcss(unitConverter({
      rules: [{
        from: unit => unit === 'u2',
        to: 'px',
        factor: 2,
      }],
      propList: ['width'],
    })).process('.rule { width: 3u2; }').css

    expect(processed).toBe('.rule { width: 6px; }')
  })

  it('resolves each complex unit matcher once per stylesheet', () => {
    let matcherCalls = 0
    const processed = postcss(unitConverter({
      rules: [
        {
          from: (unit) => {
            matcherCalls += 1
            return unit === 'foo'
          },
          to: 'px',
          factor: 2,
        },
        {
          from: 'bar',
          to: 'px',
          factor: 3,
        },
      ],
      propList: ['*'],
    })).process('.rule { a: 1foo; b: 2foo; c: 3bar; d: 4foo; }').css

    expect(processed).toBe('.rule { a: 2px; b: 4px; c: 9px; d: 8px; }')
    expect(matcherCalls).toBe(2)
  })

  it('preserves rule order when mixing string and complex matchers', () => {
    const processed = postcss(unitConverter({
      rules: [
        { from: /^rem$/, to: 'px', factor: 2 },
        { from: 'rem', to: 'px', factor: 3 },
      ],
      propList: ['width'],
    })).process('.rule { width: 1rem; }').css

    expect(processed).toBe('.rule { width: 2px; }')
  })

  it('supports keeping units for zero values', () => {
    const input = '.rule { width: 0px; }'
    const output = '.rule { width: 0rem; }'
    const processed = postcss(unitConverter({
      keepZeroUnit: true,
      rules: [
        {
          from: 'px',
          to: 'rem',
          factor: 1,
        },
      ],
      propList: ['width'],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports rpx, px, rem, vw, and vh conversion presets', () => {
    const input = '.rule { a: 20rpx; b: 20px; c: 2vw; d: 3vh; e: 1rem; }'
    const output = '.rule { a: 10px; b: 40rpx; c: 7.5px; d: 20.01px; e: 6vh; }'
    const processed = postcss(unitConverter({
      rules: [
        presets.rpxToPx(),
        presets.pxToRpx(),
        presets.vwToPx(),
        presets.vhToPx(),
        presets.remToVh({
          rootValue: 20.01,
          viewportHeight: 333.5,
        }),
      ],
      propList: ['a', 'b', 'c', 'd', 'e'],
      unitPrecision: 2,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports actual ratio-based rpx conversions to rem and viewport units', () => {
    const input = '.rule { font-size: 32rpx; width: 10vw; height: 10vh; }'
    const output = '.rule { font-size: 1rem; width: 75rpx; height: 133.4rpx; }'
    const processed = postcss(unitConverter({
      rules: [
        presets.rpxToRem(),
        presets.vwToRpx({
          viewportWidth: 375,
        }),
        presets.vhToRpx({
          viewportHeight: 667,
        }),
      ],
      propList: ['font', 'width', 'height'],
      unitPrecision: 2,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports rpx to vw preset', () => {
    const input = '.rule { width: 32rpx; }'
    const output = '.rule { width: 4vw; }'
    const processed = postcss(unitConverter({
      rules: [
        presets.rpxToVw({
          viewportWidth: 400,
        }),
      ],
      propList: ['width'],
      unitPrecision: 2,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports rpx to vh preset', () => {
    const input = '.rule { height: 32rpx; }'
    const output = '.rule { height: 2.4vh; }'
    const processed = postcss(unitConverter({
      rules: [
        presets.rpxToVh({
          viewportHeight: 666.67,
        }),
      ],
      propList: ['height'],
      unitPrecision: 2,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports grouped presets for rpx-centric workflows', () => {
    const input = '.rule { width: 16px; left: 10vw; top: 10vh; font-size: 1rem; }'
    const output = '.rule { width: 32rpx; left: 75rpx; top: 133.4rpx; font-size: 32rpx; }'
    const processed = postcss(unitConverter({
      rules: presets.rpxPresetGroup({
        rootValue: 16,
        viewportWidth: 375,
        viewportHeight: 667,
      }),
      propList: ['font', 'width', 'left', 'top'],
      unitPrecision: 2,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports grouped presets for px-centric workflows', () => {
    const input = '.rule { width: 1rem; height: 32rpx; margin-left: 10vw; margin-top: 10vh; }'
    const output = '.rule { width: 16px; height: 16px; margin-left: 37.5px; margin-top: 66.7px; }'
    const processed = postcss(unitConverter({
      rules: presets.pxPresetGroup({
        rootValue: 16,
        viewportWidth: 375,
        viewportHeight: 667,
      }),
      propList: ['width', 'height', 'margin-left', 'margin-top'],
      unitPrecision: 2,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports grouped presets for viewport-centric workflows', () => {
    const widthInput = '.rule { width: 16px; min-width: 32rpx; }'
    const widthOutput = '.rule { width: 4.26667vw; min-width: 4.26667vw; }'
    const widthProcessed = postcss(unitConverter({
      rules: presets.viewportPresetGroup({
        rootValue: 16,
        viewportWidth: 375,
      }),
      propList: ['width', 'min-width'],
      unitPrecision: 5,
    })).process(widthInput).css

    expect(widthProcessed).toBe(widthOutput)

    const heightInput = '.rule { height: 16px; min-height: 32rpx; }'
    const heightOutput = '.rule { height: 2.3988vh; min-height: 2.3988vh; }'
    const heightProcessed = postcss(unitConverter({
      rules: presets.viewportPresetGroup({
        rootValue: 16,
        viewportHeight: 667,
        viewportUnit: 'vh',
      }),
      propList: ['height', 'min-height'],
      unitPrecision: 5,
    })).process(heightInput).css

    expect(heightProcessed).toBe(heightOutput)
  })

  it('exposes preset helpers and shared helpers for direct authoring', () => {
    const single = definePreset((options: { factor?: number } = {}) => ({
      from: 'foo',
      to: 'bar',
      factor: options.factor ?? 2,
    }))
    const grouped = definePresetGroup((options: { factor?: number } = {}) => [
      single(options),
    ])

    expect(single({ factor: 3 })).toEqual({
      from: 'foo',
      to: 'bar',
      factor: 3,
    })
    expect(grouped()).toEqual([
      {
        from: 'foo',
        to: 'bar',
        factor: 2,
      },
    ])
    expect(composeRules(grouped(), single({ factor: 4 }))).toEqual([
      { from: 'foo', to: 'bar', factor: 2 },
      { from: 'foo', to: 'bar', factor: 4 },
    ])

    const input = postcss.parse('.rule{}', { from: '/src/design.css' }).source!.input
    expect(resolveNumericValue(12, input)).toBe(12)
    expect(resolveNumericValue(source => source.file?.endsWith('design.css') ? 20 : 10, input)).toBe(20)
  })

  it('supports dynamic resolver branches for preset factories', () => {
    const input = postcss.parse('.rule{}', { from: '/src/dynamic.css' }).source!.input
    const context = { input } as any

    expect(presets.remToResponsivePixel({
      rootValue: source => source.file?.endsWith('dynamic.css') ? 20 : 16,
    }).transform?.(2, context)).toBe(40)
    expect(presets.remToRpxByRatio({
      rootValue: () => 10,
      ratio: 3,
    }).transform?.(2, context)).toBe(60)
    expect(presets.pxToRem({
      rootValue: () => 20,
    }).transform?.(20, context)).toBe(1)
    expect(presets.remToVh({
      rootValue: () => 10,
      viewportHeight: () => 500,
    }).transform?.(2, context)).toBe(4)
    expect(presets.pxToViewport({
      viewportWidth: () => 250,
    }).transform?.(20, context)).toBe(8)
    expect(presets.pxToVh({
      viewportHeight: () => 500,
    }).transform?.(25, context)).toBe(5)
    expect(presets.rpxToRem({
      rootValue: () => 10,
      ratio: 0.5,
    }).transform?.(20, context)).toBe(1)
    expect(presets.rpxToVw({
      viewportWidth: () => 250,
      ratio: 1,
    }).transform?.(20, context)).toBe(8)
    expect(presets.rpxToVh({
      viewportHeight: () => 500,
      ratio: 1,
    }).transform?.(20, context)).toBe(4)
    expect(presets.vwToPx({
      viewportWidth: () => 250,
    }).transform?.(20, context)).toBe(50)
    expect(presets.vhToPx({
      viewportHeight: () => 500,
    }).transform?.(20, context)).toBe(100)
    expect(presets.vwToRem({
      viewportWidth: () => 250,
      rootValue: () => 10,
    }).transform?.(20, context)).toBe(5)
    expect(presets.vhToRem({
      viewportHeight: () => 500,
      rootValue: () => 10,
    }).transform?.(20, context)).toBe(10)
    expect(presets.vwToRpx({
      viewportWidth: () => 250,
      ratio: 1,
    }).transform?.(20, context)).toBe(50)
    expect(presets.vhToRpx({
      viewportHeight: () => 500,
      ratio: 1,
    }).transform?.(20, context)).toBe(100)

    expect(presets.remToVw({ to: 'lvw' }).to).toBe('lvw')
    expect(presets.pxToVw({ to: 'svw' }).to).toBe('svw')
    expect(presets.remToVw({ to: null as any }).to).toBe('vw')
    expect(presets.pxToVw({ to: null as any }).to).toBe('vw')
  })

  it('returns stable grouped preset definitions for web workflows', () => {
    const rules = presets.webPresetGroup({
      minValue: 1,
      ratio: 3,
      rootValue: 20,
      viewportWidth: 320,
      viewportHeight: 640,
    })

    expect(rules).toHaveLength(7)
    expect(rules.map(rule => rule.from)).toEqual(['px', 'px', 'px', 'vw', 'vh', 'vw', 'vh'])
    expect(rules.every(rule => rule.minValue === 1)).toBe(true)
    expect(rules.at(-1)?.from).toBe('vh')
    expect(rules.at(-1)?.to).toBe('rpx')
    expect(rules.at(-1)?.minValue).toBe(1)
    expect(rules.at(-1)?.factor).toBeCloseTo(19.2)
  })

  it('handles invalid rules and early-return branches without mutating css', () => {
    const noop = unitConverter()
    expect(noop).toEqual({ postcssPlugin: 'postcss-rule-unit-converter' })

    const disabled = unitConverter({
      disabled: true,
      rules: [presets.remToPx()],
    })
    expect(disabled).toEqual({ postcssPlugin: 'postcss-rule-unit-converter' })

    const invalidOnly = unitConverter({
      rules: [
        {
          from: '   ' as any,
          to: 'px',
          factor: 16,
        },
      ],
    })
    expect(invalidOnly).toEqual({ postcssPlugin: 'postcss-rule-unit-converter' })

    const input = '.rule { width: 1rem; }'
    const output = postcss(unitConverter({
      rules: [
        {
          from: '   ' as any,
          to: 'px',
          factor: 16,
        },
        presets.remToPx(),
      ],
    })).process(input).css

    expect(output).toBe('.rule { width: 16px; }')
  })

  it('covers transform fallback branches and sticky/global matcher resets', () => {
    const input = '.rule { a: 1foo; b: 2foo; c: 3foo; d: 4foo; e: 0foo; first: 1bar; second: 2bar; weird: NaNfoo; }'
    const output = '.rule { a: 1foo; b: 2foo; c: 3foo; d: 8foo; e: 0; first: 10px; second: 20px; weird: NaNfoo; }'
    const processed = postcss(unitConverter({
      rules: [
        {
          from: 'foo',
          transform(value, context) {
            switch (context.prop) {
              case 'a':
                return undefined
              case 'b':
                return Number.NaN
              case 'c':
                return { value: Number.NaN }
              case 'd':
                return value * 2
              case 'e':
                return { value: 0, unit: 'bar' }
              default:
                return undefined
            }
          },
        },
        {
          from: /^bar$/gy,
          to: 'px',
          transform: value => value * 10,
        },
      ],
      propList: ['*'],
      unitRegex: /(\d+(?:\.\d+)?|\.\d+|NaN)(foo|bar)/g,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('keeps declarations unchanged for null and non-finite transform results', () => {
    const input = '.rule { nullValue: 1foo; infinite: 1bar; overflow: 1baz; }'
    const processed = postcss(unitConverter({
      rules: [
        { from: 'foo', to: 'px', transform: () => null as any },
        { from: 'bar', to: 'px', transform: () => Number.POSITIVE_INFINITY },
        { from: 'baz', to: 'px', factor: Number.POSITIVE_INFINITY },
      ],
      propList: ['*'],
    })).process(input).css

    expect(processed).toBe(input)
  })

  it('does not reprocess fallback declarations when replace is false', () => {
    const processed = postcss(unitConverter({
      rules: [
        { from: 'rem', to: 'px', factor: 2 },
        { from: 'px', to: 'rem', factor: 2 },
      ],
      replace: false,
      propList: ['width'],
    })).process('.rule { width: 1rem; }').css

    expect(processed).toBe('.rule { width: 1rem; width: 2px; }')
  })

  it('ignores unsupported matcher types without breaking valid rules', () => {
    const input = '.rule { width: 1rem; }'
    const output = '.rule { width: 16px; }'
    const processed = postcss(unitConverter({
      rules: [
        {
          from: 123 as any,
          to: 'px',
          factor: 999,
        },
        presets.remToPx(),
      ],
      propList: ['width'],
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('supports out-of-range precision and function matchers', () => {
    const input = '.rule { width: 1baz; }'
    const output = '.rule { width: 0.3333333333333333qux; }'
    const processed = postcss(unitConverter({
      rules: [
        {
          from: unit => unit === 'baz',
          to: 'qux',
          factor: 1 / 3,
        },
      ],
      unitPrecision: 101,
      propList: ['width'],
      unitRegex: /(\d+(?:\.\d+)?|\.\d+)(baz)/g,
    })).process(input).css

    expect(processed).toBe(output)
  })

  it('keeps original units when a rule omits the target unit', () => {
    const input = '.rule { width: 2abc; }'
    const output = '.rule { width: 6abc; }'
    const processed = postcss(unitConverter({
      rules: [
        {
          from: 'abc',
          factor: 3,
        },
      ],
      propList: ['width'],
      unitRegex: /(\d+(?:\.\d+)?|\.\d+)(abc)/g,
    })).process(input).css

    expect(processed).toBe(output)
  })
})
