import type { Input, Result, Root } from 'postcss'
import type { ConversionRule } from 'postcss-rule-unit-converter'
import type {
  PxTransformMethod,
  PxTransformOptions,
  PxTransformTargetUnit,
} from './types'
import { emitWarning } from 'node:process'
import {
  createAdvancedPropListMatcher,
  createSelectorBlacklistMatcher,
} from 'postcss-plugin-shared'
import unitConverter from 'postcss-rule-unit-converter'
import { pxRegex } from './pixel-unit-regex'

export { createDirectivePlugin } from './directives'
export * from './types'

const defaults = {
  methods: ['platform', 'size'] as PxTransformMethod[],
  rootValue: 16,
  unitPrecision: 5,
  selectorBlackList: [] as Array<string | RegExp>,
  propList: ['*'] as string[],
  replace: true,
  mediaQuery: false,
  minPixelValue: 0,
}

const deviceRatio: NonNullable<PxTransformOptions['deviceRatio']> = {
  375: 2,
  640: 2.34 / 2,
  750: 1,
  828: 1.81 / 2,
}

const DEFAULT_WEAPP_OPTIONS: Required<Pick<PxTransformOptions, 'platform' | 'designWidth' | 'deviceRatio'>> = {
  platform: 'weapp',
  designWidth: 750,
  deviceRatio,
}

const SPECIAL_PIXEL = ['Px', 'PX', 'pX'] as const
const SPECIAL_PIXEL_SET = new Set<string>(SPECIAL_PIXEL)
const postcssPlugin = 'postcss-pxtrans'
const warnedLegacyOptions = new Set<string>()

type RootValueFn = (input: Input, m: string, value: string) => number

function warnLegacyOption(alias: string, replacement: string) {
  if (warnedLegacyOptions.has(alias)) {
    return
  }
  warnedLegacyOptions.add(alias)
  emitWarning(
    `postcss-pxtrans option "${alias}" is deprecated; use "${replacement}" instead.`,
    { code: 'POSTCSS_PXTRANS_LEGACY_OPTION', type: 'DeprecationWarning' },
  )
}

function normalizeLegacyOptions(userOptions: PxTransformOptions) {
  const normalized = { ...userOptions }
  if (normalized.rootValue === undefined && userOptions.root_value !== undefined) {
    normalized.rootValue = userOptions.root_value
    warnLegacyOption('root_value', 'rootValue')
  }
  if (normalized.unitPrecision === undefined && userOptions.unit_precision !== undefined) {
    normalized.unitPrecision = userOptions.unit_precision
    warnLegacyOption('unit_precision', 'unitPrecision')
  }
  if (normalized.selectorBlackList === undefined && userOptions.selector_black_list !== undefined) {
    normalized.selectorBlackList = userOptions.selector_black_list
    warnLegacyOption('selector_black_list', 'selectorBlackList')
  }
  if (normalized.propList === undefined && userOptions.prop_list !== undefined) {
    normalized.propList = userOptions.prop_list
    warnLegacyOption('prop_list', 'propList')
  }
  if (normalized.mediaQuery === undefined && userOptions.media_query !== undefined) {
    normalized.mediaQuery = userOptions.media_query
    warnLegacyOption('media_query', 'mediaQuery')
  }
  if (normalized.minPixelValue === undefined && userOptions.min_pixel_value !== undefined) {
    normalized.minPixelValue = userOptions.min_pixel_value
    warnLegacyOption('min_pixel_value', 'minPixelValue')
  }
  if (normalized.onePxTransform === undefined && userOptions.one_px_transform !== undefined) {
    normalized.onePxTransform = userOptions.one_px_transform
    warnLegacyOption('one_px_transform', 'onePxTransform')
  }
  if (normalized.baseFontSize === undefined && userOptions.base_font_size !== undefined) {
    normalized.baseFontSize = userOptions.base_font_size
    warnLegacyOption('base_font_size', 'baseFontSize')
  }
  if (normalized.minRootSize === undefined && userOptions.min_root_size !== undefined) {
    normalized.minRootSize = userOptions.min_root_size
    warnLegacyOption('min_root_size', 'minRootSize')
  }
  if (normalized.targetUnit === undefined && userOptions.target_unit !== undefined) {
    normalized.targetUnit = userOptions.target_unit
    warnLegacyOption('target_unit', 'targetUnit')
  }
  if (normalized.designWidth === undefined && userOptions.design_width !== undefined) {
    normalized.designWidth = userOptions.design_width
    warnLegacyOption('design_width', 'designWidth')
  }
  if (normalized.deviceRatio === undefined && userOptions.device_ratio !== undefined) {
    normalized.deviceRatio = userOptions.device_ratio
    warnLegacyOption('device_ratio', 'deviceRatio')
  }
  return normalized
}

function normalizeRootValue(value: unknown): RootValueFn {
  if (typeof value === 'function') {
    return value as RootValueFn
  }
  if (typeof value === 'number') {
    return () => value
  }
  /* c8 ignore next */
  return () => defaults.rootValue
}

/**
 * Convert px (and rpx) to target units based on platform rules.
 *
 * Defaults:
 * - platform: 'weapp'
 * - designWidth: 750
 * - deviceRatio: { 375: 2, 640: 1.17, 750: 1, 828: 0.905 }
 * - methods: ['platform', 'size']
 * - targetUnit: 'rpx' (weapp), 'rem' (h5)
 * - unitPrecision: 5
 * - propList: ['*']
 * - replace: true
 * - mediaQuery: false
 * - minPixelValue: 0
 * - onePxTransform: true
 *
 * @example
 * import postcss from 'postcss'
 * import pxtrans from 'postcss-pxtrans'
 *
 * const result = await postcss([pxtrans({
 *   platform: 'h5',
 *   designWidth: 375,
 *   targetUnit: 'vw',
 * })]).process('.a{padding:16px}', { from: undefined })
 */
function plugin(userOptions: PxTransformOptions = {}) {
  const normalizedUserOptions = normalizeLegacyOptions(userOptions)
  const options: Required<Pick<PxTransformOptions, 'platform' | 'designWidth' | 'deviceRatio'>> & PxTransformOptions = {
    ...DEFAULT_WEAPP_OPTIONS,
    ...normalizedUserOptions,
  }

  const exclude: PxTransformOptions['exclude'] = options.exclude
  const transUnits: string[] = ['px']
  const minRootSize = options.minRootSize ?? 0
  const baseFontSize = options.baseFontSize ?? (minRootSize >= 1 ? minRootSize : 20)

  const designWidth = (input: Input) =>
    typeof options.designWidth === 'function'
      ? options.designWidth(input)
      : options.designWidth

  const deviceRatioValue = (input: Input) =>
    options.deviceRatio[designWidth(input)] ?? 1

  let targetUnit: PxTransformTargetUnit
  let unConvertTargetUnit: string | undefined
  let computedRootValue: RootValueFn | number | undefined

  /* c8 ignore start */
  const platform = options.platform
  switch (platform) {
    case 'h5': {
      targetUnit = (options.targetUnit ?? 'rem') as PxTransformTargetUnit

      switch (targetUnit) {
        case 'vw':
        case 'vmin':
          computedRootValue = (input: Input) => designWidth(input) / 100
          break
        case 'px':
          computedRootValue = (input: Input) =>
            (1 / deviceRatioValue(input)) * 2
          break
        default:
          computedRootValue = (input: Input) =>
            (baseFontSize / deviceRatioValue(input)) * 2
          break
      }

      transUnits.push('rpx')
      break
    }
    case 'rn': {
      computedRootValue = (input: Input) =>
        (1 / deviceRatioValue(input)) * 2
      targetUnit = 'px'
      break
    }
    case 'quickapp': {
      computedRootValue = () => 1
      targetUnit = 'px'
      break
    }
    case 'harmony': {
      /* c8 ignore start */
      computedRootValue = (input: Input) =>
        1 / deviceRatioValue(input)
      targetUnit = 'px'
      unConvertTargetUnit = 'ch'
      transUnits.push(...SPECIAL_PIXEL)
      break
      /* c8 ignore end */
    }
    default: {
      targetUnit = (options.targetUnit ?? 'rpx') as PxTransformTargetUnit
      if (targetUnit === 'rem') {
        computedRootValue = (input: Input) =>
          (baseFontSize / deviceRatioValue(input)) * 2
      }
      else if (targetUnit === 'px') {
        computedRootValue = (input: Input) =>
          (1 / deviceRatioValue(input)) * 2
      }
      else {
        computedRootValue = (input: Input) =>
          1 / deviceRatioValue(input)
      }
    }
  }
  /* c8 ignore end */

  /* c8 ignore start */
  const resolvedRootValue = typeof normalizedUserOptions.rootValue !== 'undefined'
    ? normalizedUserOptions.rootValue
    : computedRootValue ?? defaults.rootValue
  const cacheComputedRootValue
    = typeof normalizedUserOptions.rootValue === 'undefined'
      && typeof resolvedRootValue === 'function'
      && (resolvedRootValue as RootValueFn).length <= 1

  const opts = {
    ...defaults,
    ...options,
    rootValue: resolvedRootValue as number | RootValueFn,
  } as PxTransformOptions & {
    rootValue: number | RootValueFn
    methods: readonly PxTransformMethod[]
  }
  const onePxTransform
    = typeof options.onePxTransform === 'undefined'
      ? true
      : options.onePxTransform

  const shouldHandleSize = opts.methods.includes('size')
  const hasSelectorBlackList = Boolean(opts.selectorBlackList?.length)
  const satisfyPropList = createAdvancedPropListMatcher(opts.propList ?? defaults.propList)
  /* c8 ignore end */

  if (!shouldHandleSize) {
    return { postcssPlugin }
  }

  const getRootValue = (() => {
    if (!cacheComputedRootValue) {
      return (_input: Input) => normalizeRootValue(opts.rootValue)
    }

    const cache = new WeakMap<Input, RootValueFn>()
    return (input: Input) => {
      const cached = cache.get(input)
      if (cached) {
        return cached
      }

      const value = (opts.rootValue as RootValueFn)(input, '', '')
      const resolver: RootValueFn = () => value
      cache.set(input, resolver)
      return resolver
    }
  })()
  const isHarmony = platform === 'harmony'
  const preserveUnit = unConvertTargetUnit ?? targetUnit
  const unitPrecision = opts.unitPrecision ?? defaults.unitPrecision
  const minPixelValue = opts.minPixelValue ?? defaults.minPixelValue
  const isBlacklisted = hasSelectorBlackList
    ? createSelectorBlacklistMatcher(opts.selectorBlackList as readonly (string | RegExp)[], { cache: true })
    : undefined

  const rules: ConversionRule[] = [
    {
      from: unit => unit === 'px' || unit === 'rpx',
      transform(value, context) {
        if (context.prop && !satisfyPropList(context.prop)) {
          return undefined
        }

        const selectorBlocked = context.rule && isBlacklisted?.(context.rule)
        if (selectorBlocked) {
          if (!isHarmony) {
            return undefined
          }
          return {
            value,
            unit: preserveUnit,
          }
        }

        if (isHarmony && SPECIAL_PIXEL_SET.has(context.rawUnit)) {
          return {
            value,
            unit: preserveUnit,
          }
        }

        if (!onePxTransform && value === 1) {
          return isHarmony
            ? {
                value,
                unit: preserveUnit,
              }
            : undefined
        }

        if (value < minPixelValue) {
          return isHarmony
            ? {
                value,
                unit: preserveUnit,
              }
            : undefined
        }

        return {
          value: value / getRootValue(context.input)(context.input, context.match, context.rawValue),
          unit: targetUnit,
        }
      },
    },
  ]

  const wrappedPlugin = unitConverter({
    exclude: [],
    keepZeroUnit: true,
    mediaQuery: opts.mediaQuery ?? defaults.mediaQuery,
    minValue: 0,
    propList: ['*'],
    replace: opts.replace ?? defaults.replace,
    rules,
    unitPrecision,
    unitRegex: pxRegex(transUnits),
  }) as { Once?: (css: Root) => void }

  return {
    postcssPlugin,
    prepare(result: Result) {
      const from = result.opts.from
      const isExcluded = exclude
        ? Array.isArray(exclude)
          ? exclude.some((rule) => {
              if (typeof rule === 'string') {
                return from?.includes(rule)
              }
              return from ? Boolean(from.match(rule)) : false
            })
          : typeof exclude === 'function'
            ? exclude(from)
            : false
        : false

      return {
        Once(css: Root) {
          css.walkComments((comment) => {
            if (comment.text === 'postcss-pxtrans disable') {
              css.raws['__pxtransSkip'] = true
              return false
            }
            return undefined
          })

          if (css.raws['__pxtransSkip'] || isExcluded) {
            return
          }

          wrappedPlugin.Once?.(css)
        },
      }
    },
  }
}

plugin.postcss = true

export default plugin
