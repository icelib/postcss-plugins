import type {
  ConversionRule,
  RuleContext,
} from 'postcss-rule-unit-converter'
import type {
  PostcssUnitsToPx,
  TransformContext,
  UnitMap,
  UnitMatcher,
  UnitRule,
  UserDefinedOptions,
} from './types'
import unitConverter from 'postcss-rule-unit-converter'
import { defaultUnitMap } from './defaults'
import { getConfig, postcssPlugin } from './shared'

interface NormalizeEntry {
  matcher: UnitMatcher
  rule: UnitRule | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function normalizeRule(rule: UnitRule | undefined) {
  return rule === undefined ? null : rule
}

function normalizeUnitMap(unitMap: UnitMap): NormalizeEntry[] {
  const entries: NormalizeEntry[] = []
  const addEntry = (matcher: UnitMatcher, rule: UnitRule | undefined) => {
    if (typeof matcher === 'string') {
      const unit = matcher.trim().toLowerCase()
      if (!unit) {
        return
      }
      entries.push({
        matcher: unit,
        rule: normalizeRule(rule),
      })
      return
    }

    entries.push({
      matcher,
      rule: normalizeRule(rule),
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

function createUnitTransformRule(
  matcher: UnitMatcher,
  rule: UnitRule | null,
  transform: UserDefinedOptions['transform'],
): ConversionRule {
  if (typeof rule === 'number') {
    return {
      from: matcher,
      to: 'px',
      factor: rule,
    }
  }

  return {
    from: matcher,
    to: 'px',
    transform(value: number, context: RuleContext) {
      if (rule === false) {
        return undefined
      }

      if (typeof rule === 'function') {
        return rule(value, context as TransformContext)
      }

      if (transform) {
        return transform(value, context.fromUnit, context as TransformContext)
      }

      return undefined
    },
  }
}

function resolveUnitMap(options: UserDefinedOptions) {
  const userUnitMap = options.unitMap
  if (userUnitMap === undefined) {
    return defaultUnitMap
  }

  if (isPlainObject(userUnitMap)) {
    return {
      ...defaultUnitMap,
      ...userUnitMap,
    }
  }

  return userUnitMap
}

const plugin: PostcssUnitsToPx = (options: UserDefinedOptions = {}) => {
  const resolved = getConfig(options)
  const {
    transform,
    unitPrecision,
    minValue,
    selectorBlackList,
    propList,
    replace,
    mediaQuery,
    exclude,
    disabled,
  } = resolved

  if (disabled || transform === false) {
    return { postcssPlugin }
  }

  const unitMap = resolveUnitMap(options)
  const rules = normalizeUnitMap(unitMap).map(entry => createUnitTransformRule(
    entry.matcher,
    entry.rule,
    transform,
  ))

  if (rules.length === 0) {
    return { postcssPlugin }
  }

  const wrappedPlugin = unitConverter({
    exclude,
    mediaQuery,
    minValue,
    propList,
    replace,
    rules,
    selectorBlackList,
    unitPrecision,
  }) as { Once?: (css: unknown) => void }

  return {
    postcssPlugin,
    Once(css) {
      wrappedPlugin.Once?.(css)
    },
  }
}

plugin.postcss = true

export default plugin
