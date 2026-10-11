import type {
  ConversionRule,
  GlobalUnitTransform,
  NumericResolver,
  PresetFactory,
  PresetGroupFactory,
  PresetOptions,
  RuleContext,
  UnitMap,
  UnitMatcher,
  UnitRule,
} from './types'
import { resolveNumericValue } from './shared'

export interface LinearPresetOptions {
  minValue?: number
  to?: string
}

export interface RatioOptions {
  ratio?: number
}

export interface RemBasedPresetOptions extends LinearPresetOptions {
  rootValue?: NumericResolver
}

export interface ViewportPresetOptions extends LinearPresetOptions {
  viewportWidth?: NumericResolver
}

export interface ViewportHeightPresetOptions extends LinearPresetOptions {
  viewportHeight?: NumericResolver
}

export interface RemToViewportPresetOptions extends LinearPresetOptions {
  rootValue?: NumericResolver
  viewportWidth?: NumericResolver
}

export interface RemToViewportHeightPresetOptions extends LinearPresetOptions {
  rootValue?: NumericResolver
  viewportHeight?: NumericResolver
}

export interface UnitMapPresetOptions {
  minValue?: number
  unitMap?: UnitMap
  to?: string
  transform?: GlobalUnitTransform | false
}

export interface RpxPresetGroupOptions {
  minValue?: number
  ratio?: number
  rootValue?: NumericResolver
  viewportWidth?: NumericResolver
  viewportHeight?: NumericResolver
}

export interface PxPresetGroupOptions {
  minValue?: number
  ratio?: number
  rootValue?: NumericResolver
  viewportWidth?: NumericResolver
  viewportHeight?: NumericResolver
}

export interface ViewportGroupOptions extends PxPresetGroupOptions {
  viewportUnit?: 'vw' | 'vh'
}

function maybeMinValue(minValue: number | undefined) {
  return minValue === undefined ? {} : { minValue }
}

function createStaticFactorRule(
  from: string,
  to: string,
  minValue: number | undefined,
  factor: number,
): ConversionRule {
  return {
    from,
    to,
    factor,
    ...maybeMinValue(minValue),
  }
}

const defaultUnitMap = {
  rem: 16,
  em: 16,
  vw: 3.75,
  vh: 6.67,
  vmin: 3.75,
  vmax: 6.67,
  rpx: 0.5,
} satisfies Record<string, number>

interface UnitMapEntry {
  matcher: UnitMatcher
  rule: UnitRule | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function normalizeUnitRule(rule: UnitRule | undefined) {
  return rule === undefined ? null : rule
}

function normalizeUnitMap(unitMap: UnitMap): UnitMapEntry[] {
  const entries: UnitMapEntry[] = []
  const addEntry = (matcher: UnitMatcher, rule: UnitRule | undefined) => {
    if (typeof matcher === 'string') {
      const unit = matcher.trim().toLowerCase()
      if (!unit) {
        return
      }
      entries.push({
        matcher: unit,
        rule: normalizeUnitRule(rule),
      })
      return
    }

    entries.push({
      matcher,
      rule: normalizeUnitRule(rule),
    })
  }

  if (Array.isArray(unitMap)) {
    for (const entry of unitMap) {
      if (!entry) {
        continue
      }
      const [matcher, rule] = entry
      addEntry(matcher, rule)
    }
    return entries
  }

  if (unitMap instanceof Map) {
    for (const [matcher, rule] of unitMap.entries()) {
      addEntry(matcher, rule)
    }
    return entries
  }

  for (const [matcher, rule] of Object.entries(unitMap)) {
    addEntry(matcher, rule as UnitRule | undefined)
  }

  return entries
}

function resolveUnitMap(unitMap: UnitMap | undefined) {
  if (unitMap === undefined) {
    return defaultUnitMap
  }

  if (isPlainObject(unitMap)) {
    return {
      ...defaultUnitMap,
      ...unitMap,
    }
  }

  return unitMap
}

function createUnitTransformRule(
  matcher: UnitMatcher,
  rule: UnitRule | null,
  to: string,
  minValue: number | undefined,
  transform: GlobalUnitTransform | false | undefined,
): ConversionRule {
  if (typeof rule === 'number') {
    return {
      from: matcher,
      to,
      factor: rule,
      ...maybeMinValue(minValue),
    }
  }

  return {
    from: matcher,
    to,
    ...maybeMinValue(minValue),
    transform(value: number, context: RuleContext) {
      if (rule === false || transform === false) {
        return undefined
      }

      if (typeof rule === 'function') {
        return rule(value, context)
      }

      if (transform) {
        return transform(value, context.fromUnit, context)
      }

      return undefined
    },
  }
}

/**
 * Helper for authoring a typed single-rule preset.
 */
export function definePreset<TOptions extends PresetOptions = undefined>(
  factory: PresetFactory<TOptions>,
) {
  return factory
}

/**
 * Helper for authoring a typed grouped preset.
 */
export function definePresetGroup<TOptions extends PresetOptions = undefined>(
  factory: PresetGroupFactory<TOptions>,
) {
  return factory
}

export function remToPx(options: RemBasedPresetOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, to = 'px' } = options
  if (typeof rootValue === 'number') {
    return createStaticFactorRule('rem', to, minValue, rootValue)
  }
  return {
    from: 'rem',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * resolveNumericValue(rootValue, context.input),
  }
}

export function remToRpx(options: RemBasedPresetOptions = {}): ConversionRule {
  return remToPx({
    ...options,
    to: options.to ?? 'rpx',
  })
}

export function remToResponsivePixel(options: RemBasedPresetOptions = {}): ConversionRule {
  return remToPx(options)
}

export function remToViewport(options: RemToViewportPresetOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, viewportWidth = 375, to = 'vw' } = options
  if (typeof rootValue === 'number' && typeof viewportWidth === 'number') {
    return createStaticFactorRule('rem', to, minValue, rootValue * 100 / viewportWidth)
  }
  return {
    from: 'rem',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => {
      const resolvedRootValue = resolveNumericValue(rootValue, context.input)
      const resolvedViewportWidth = resolveNumericValue(viewportWidth, context.input)
      return value * resolvedRootValue * 100 / resolvedViewportWidth
    },
  }
}

export function remToVw(options: RemToViewportPresetOptions = {}): ConversionRule {
  return remToViewport({
    ...options,
    to: options.to ?? 'vw',
  })
}

export function remToVh(options: RemToViewportHeightPresetOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, viewportHeight = 667, to = 'vh' } = options
  if (typeof rootValue === 'number' && typeof viewportHeight === 'number') {
    return createStaticFactorRule('rem', to, minValue, rootValue * 100 / viewportHeight)
  }
  return {
    from: 'rem',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => {
      const resolvedRootValue = resolveNumericValue(rootValue, context.input)
      const resolvedViewportHeight = resolveNumericValue(viewportHeight, context.input)
      return value * resolvedRootValue * 100 / resolvedViewportHeight
    },
  }
}

export function pxToRem(options: RemBasedPresetOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, to = 'rem' } = options
  if (typeof rootValue === 'number') {
    return createStaticFactorRule('px', to, minValue, 1 / rootValue)
  }
  return {
    from: 'px',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value / resolveNumericValue(rootValue, context.input),
  }
}

export function pxToViewport(options: ViewportPresetOptions = {}): ConversionRule {
  const { minValue, viewportWidth = 375, to = 'vw' } = options
  if (typeof viewportWidth === 'number') {
    return createStaticFactorRule('px', to, minValue, 100 / viewportWidth)
  }
  return {
    from: 'px',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * 100 / resolveNumericValue(viewportWidth, context.input),
  }
}

export function pxToVw(options: ViewportPresetOptions = {}): ConversionRule {
  return pxToViewport({
    ...options,
    to: options.to ?? 'vw',
  })
}

export function pxToVh(options: ViewportHeightPresetOptions = {}): ConversionRule {
  const { minValue, viewportHeight = 667, to = 'vh' } = options
  if (typeof viewportHeight === 'number') {
    return createStaticFactorRule('px', to, minValue, 100 / viewportHeight)
  }
  return {
    from: 'px',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * 100 / resolveNumericValue(viewportHeight, context.input),
  }
}

export function rpxToPx(options: LinearPresetOptions & { ratio?: number } = {}): ConversionRule {
  const { minValue, ratio = 0.5, to = 'px' } = options
  return {
    from: 'rpx',
    to,
    ...maybeMinValue(minValue),
    factor: ratio,
  }
}

export function pxToRpx(options: LinearPresetOptions & RatioOptions = {}): ConversionRule {
  const { minValue, ratio = 2, to = 'rpx' } = options
  return {
    from: 'px',
    to,
    ...maybeMinValue(minValue),
    factor: ratio,
  }
}

export function rpxToRem(options: RemBasedPresetOptions & RatioOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, ratio = 0.5, to = 'rem' } = options
  if (typeof rootValue === 'number') {
    return createStaticFactorRule('rpx', to, minValue, ratio / rootValue)
  }
  return {
    from: 'rpx',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * ratio / resolveNumericValue(rootValue, context.input),
  }
}

export function remToRpxRatio(options: RemBasedPresetOptions & RatioOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, ratio = 2, to = 'rpx' } = options
  if (typeof rootValue === 'number') {
    return createStaticFactorRule('rem', to, minValue, rootValue * ratio)
  }
  return {
    from: 'rem',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * resolveNumericValue(rootValue, context.input) * ratio,
  }
}

export function remToRpxByRatio(options: RemBasedPresetOptions & RatioOptions = {}): ConversionRule {
  return remToRpxRatio(options)
}

export function rpxToVw(options: ViewportPresetOptions & RatioOptions = {}): ConversionRule {
  const { minValue, viewportWidth = 375, ratio = 0.5, to = 'vw' } = options
  if (typeof viewportWidth === 'number') {
    return createStaticFactorRule('rpx', to, minValue, ratio * 100 / viewportWidth)
  }
  return {
    from: 'rpx',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * ratio * 100 / resolveNumericValue(viewportWidth, context.input),
  }
}

export function rpxToVh(options: ViewportHeightPresetOptions & RatioOptions = {}): ConversionRule {
  const { minValue, viewportHeight = 667, ratio = 0.5, to = 'vh' } = options
  if (typeof viewportHeight === 'number') {
    return createStaticFactorRule('rpx', to, minValue, ratio * 100 / viewportHeight)
  }
  return {
    from: 'rpx',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * ratio * 100 / resolveNumericValue(viewportHeight, context.input),
  }
}

export function vwToPx(options: ViewportPresetOptions = {}): ConversionRule {
  const { minValue, viewportWidth = 375, to = 'px' } = options
  if (typeof viewportWidth === 'number') {
    return createStaticFactorRule('vw', to, minValue, viewportWidth / 100)
  }
  return {
    from: 'vw',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * resolveNumericValue(viewportWidth, context.input) / 100,
  }
}

export function vhToPx(options: ViewportHeightPresetOptions = {}): ConversionRule {
  const { minValue, viewportHeight = 667, to = 'px' } = options
  if (typeof viewportHeight === 'number') {
    return createStaticFactorRule('vh', to, minValue, viewportHeight / 100)
  }
  return {
    from: 'vh',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * resolveNumericValue(viewportHeight, context.input) / 100,
  }
}

export function vwToRem(options: RemToViewportPresetOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, viewportWidth = 375, to = 'rem' } = options
  return {
    from: 'vw',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => {
      const width = resolveNumericValue(viewportWidth, context.input)
      const root = resolveNumericValue(rootValue, context.input)
      return value * width / 100 / root
    },
  }
}

export function vhToRem(options: RemToViewportHeightPresetOptions = {}): ConversionRule {
  const { minValue, rootValue = 16, viewportHeight = 667, to = 'rem' } = options
  return {
    from: 'vh',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => {
      const height = resolveNumericValue(viewportHeight, context.input)
      const root = resolveNumericValue(rootValue, context.input)
      return value * height / 100 / root
    },
  }
}

export function vwToRpx(options: ViewportPresetOptions & RatioOptions = {}): ConversionRule {
  const { minValue, viewportWidth = 375, ratio = 2, to = 'rpx' } = options
  if (typeof viewportWidth === 'number') {
    return createStaticFactorRule('vw', to, minValue, viewportWidth / 100 * ratio)
  }
  return {
    from: 'vw',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * resolveNumericValue(viewportWidth, context.input) / 100 * ratio,
  }
}

export function vhToRpx(options: ViewportHeightPresetOptions & RatioOptions = {}): ConversionRule {
  const { minValue, viewportHeight = 667, ratio = 2, to = 'rpx' } = options
  if (typeof viewportHeight === 'number') {
    return createStaticFactorRule('vh', to, minValue, viewportHeight / 100 * ratio)
  }
  return {
    from: 'vh',
    to,
    ...maybeMinValue(minValue),
    transform: (value, context) => value * resolveNumericValue(viewportHeight, context.input) / 100 * ratio,
  }
}

export function unitsToPx(options: UnitMapPresetOptions = {}): ConversionRule[] {
  const {
    minValue,
    to = 'px',
    transform,
    unitMap,
  } = options

  if (transform === false) {
    return []
  }

  return normalizeUnitMap(resolveUnitMap(unitMap)).map(entry => createUnitTransformRule(
    entry.matcher,
    entry.rule,
    to,
    minValue,
    transform,
  ))
}

/**
 * Common preset group that normalizes `px/rem/vw/vh` into `rpx`.
 */
export function rpxPresetGroup(options: RpxPresetGroupOptions = {}): ConversionRule[] {
  const {
    minValue,
    ratio = 2,
    rootValue = 16,
    viewportWidth = 375,
    viewportHeight = 667,
  } = options

  return [
    pxToRpx({ ...maybeMinValue(minValue), ratio, to: 'rpx' }),
    remToRpxRatio({ ...maybeMinValue(minValue), ratio, rootValue, to: 'rpx' }),
    vwToRpx({ ...maybeMinValue(minValue), ratio, viewportWidth, to: 'rpx' }),
    vhToRpx({ ...maybeMinValue(minValue), ratio, viewportHeight, to: 'rpx' }),
  ]
}

/**
 * Common preset group that normalizes `rem/rpx/vw/vh` into `px`.
 */
export function pxPresetGroup(options: PxPresetGroupOptions = {}): ConversionRule[] {
  const {
    minValue,
    ratio = 0.5,
    rootValue = 16,
    viewportWidth = 375,
    viewportHeight = 667,
  } = options

  return [
    remToPx({ ...maybeMinValue(minValue), rootValue, to: 'px' }),
    rpxToPx({ ...maybeMinValue(minValue), ratio, to: 'px' }),
    vwToPx({ ...maybeMinValue(minValue), viewportWidth, to: 'px' }),
    vhToPx({ ...maybeMinValue(minValue), viewportHeight, to: 'px' }),
  ]
}

/**
 * Common preset group that normalizes `px/rem/rpx` into viewport units.
 */
export function viewportPresetGroup(options: ViewportGroupOptions = {}): ConversionRule[] {
  const {
    minValue,
    ratio = 0.5,
    rootValue = 16,
    viewportWidth = 375,
    viewportHeight = 667,
    viewportUnit = 'vw',
  } = options

  return viewportUnit === 'vh'
    ? [
        pxToVh({ ...maybeMinValue(minValue), viewportHeight, to: 'vh' }),
        remToVh({ ...maybeMinValue(minValue), rootValue, viewportHeight, to: 'vh' }),
        rpxToVh({ ...maybeMinValue(minValue), ratio, viewportHeight, to: 'vh' }),
      ]
    : [
        pxToVw({ ...maybeMinValue(minValue), viewportWidth, to: 'vw' }),
        remToVw({ ...maybeMinValue(minValue), rootValue, viewportWidth, to: 'vw' }),
        rpxToVw({ ...maybeMinValue(minValue), ratio, viewportWidth, to: 'vw' }),
      ]
}

/**
 * Common preset group for `rem/px/vw/vh` conversions in web-style layouts.
 */
export function webPresetGroup(options: PxPresetGroupOptions = {}): ConversionRule[] {
  const {
    minValue,
    ratio = 2,
    rootValue = 16,
    viewportWidth = 375,
    viewportHeight = 667,
  } = options

  return [
    pxToRem({ ...maybeMinValue(minValue), rootValue, to: 'rem' }),
    pxToVw({ ...maybeMinValue(minValue), viewportWidth, to: 'vw' }),
    pxToVh({ ...maybeMinValue(minValue), viewportHeight, to: 'vh' }),
    vwToRem({ ...maybeMinValue(minValue), rootValue, viewportWidth, to: 'rem' }),
    vhToRem({ ...maybeMinValue(minValue), rootValue, viewportHeight, to: 'rem' }),
    vwToRpx({ ...maybeMinValue(minValue), ratio, viewportWidth, to: 'rpx' }),
    vhToRpx({ ...maybeMinValue(minValue), ratio, viewportHeight, to: 'rpx' }),
  ]
}

export const presets = {
  definePreset,
  definePresetGroup,
  remToPx,
  remToRpx,
  remToRpxByRatio,
  remToRpxRatio,
  remToResponsivePixel,
  remToViewport,
  remToVw,
  remToVh,
  pxToRem,
  pxToViewport,
  pxToVw,
  pxToVh,
  pxToRpx,
  rpxToPx,
  rpxToRem,
  rpxToVw,
  rpxToVh,
  vwToPx,
  vhToPx,
  vwToRem,
  vhToRem,
  vwToRpx,
  vhToRpx,
  pxPresetGroup,
  rpxPresetGroup,
  viewportPresetGroup,
  webPresetGroup,
  unitsToPx,
}
