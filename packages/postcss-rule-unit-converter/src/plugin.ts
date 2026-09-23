import type {
  ConversionRule,
  PostcssUnitConverter,
  RuleContext,
  UnitMatcher,
  UserDefinedOptions,
} from './types'
import {
  createAnyUnitRegex,
  createUnitRegex,
  getConfig,
  postcssPlugin,
  toFixed,
  walkAndReplaceValues,
} from './shared'

interface StringMatcherEntry {
  matcher: string
  rule: ConversionRule
  type: 'string'
  unit: string
  order: number
}

interface RegexMatcherEntry {
  matcher: RegExp
  rule: ConversionRule
  type: 'regex'
  order: number
}

interface FunctionMatcherEntry {
  matcher: (unit: string) => boolean
  rule: ConversionRule
  type: 'function'
  order: number
}

type NormalizedMatcher = StringMatcherEntry | RegexMatcherEntry | FunctionMatcherEntry

function countCapturingGroups(source: string) {
  let count = 0
  let escaped = false
  let inClass = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '[') {
      inClass = true
      continue
    }
    if (char === ']' && inClass) {
      inClass = false
      continue
    }
    if (inClass || char !== '(') {
      continue
    }

    if (source[index + 1] !== '?') {
      count += 1
      continue
    }

    // Named captures (`(?<unit>...)`) are positional captures too. Lookbehind
    // uses `(?<=`/`(?<!` and must remain non-capturing here.
    if (source[index + 2] === '<' && source[index + 3] !== '=' && source[index + 3] !== '!') {
      count += 1
    }
  }

  return count
}

function normalizeMatcher(matcher: UnitMatcher, rule: ConversionRule, order: number) {
  if (typeof matcher === 'string') {
    const unit = matcher.trim().toLowerCase()
    if (!unit) {
      return null
    }
    return {
      matcher: unit,
      rule,
      type: 'string',
      unit,
      order,
    } satisfies StringMatcherEntry
  }

  if (matcher instanceof RegExp) {
    return {
      matcher,
      rule,
      type: 'regex',
      order,
    } satisfies RegexMatcherEntry
  }

  if (typeof matcher === 'function') {
    return {
      matcher,
      rule,
      type: 'function',
      order,
    } satisfies FunctionMatcherEntry
  }

  return null
}

function normalizeRules(rules: readonly ConversionRule[]) {
  const entries: NormalizedMatcher[] = []

  for (const rule of rules) {
    const entry = normalizeMatcher(rule.from, rule, entries.length)
    if (entry) {
      entries.push(entry)
    }
  }

  const hasComplexMatcher = entries.some(entry => entry.type !== 'string')
  const stringRules = new Map<string, StringMatcherEntry>()
  for (const entry of entries) {
    if (entry.type === 'string' && !stringRules.has(entry.unit)) {
      stringRules.set(entry.unit, entry)
    }
  }

  return {
    entries,
    stringRules,
    hasComplexMatcher,
  }
}

function getMatcherRuleWithStrings(
  entries: readonly NormalizedMatcher[],
  unit: string,
  stringRules?: ReadonlyMap<string, StringMatcherEntry>,
) {
  const stringEntry = stringRules?.get(unit)
  const stringOrder = stringEntry?.order ?? Number.POSITIVE_INFINITY

  for (const entry of entries) {
    // A string rule is resolved from the map below. Once its original order
    // is reached, no later rule can win over it.
    if (entry.order >= stringOrder) {
      break
    }
    if (entry.type === 'string') {
      continue
    }

    if (entry.type === 'regex') {
      if (entry.matcher.global || entry.matcher.sticky) {
        entry.matcher.lastIndex = 0
      }
      if (entry.matcher.test(unit)) {
        return entry.rule
      }
      continue
    }

    if (entry.matcher(unit)) {
      return entry.rule
    }
  }

  return stringEntry?.rule
}

function normalizeTransformResult(
  result: unknown,
  fallbackUnit: string,
) {
  if (result === undefined || result === null) {
    return null
  }

  if (typeof result === 'number') {
    if (!Number.isFinite(result)) {
      return null
    }
    return {
      unit: fallbackUnit,
      value: result,
    }
  }

  if (typeof result !== 'object' || !('value' in result)) {
    return null
  }

  const value = result.value
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  const unit = 'unit' in result && typeof result.unit === 'string'
    ? result.unit
    : fallbackUnit

  return {
    unit,
    value,
  }
}

function createReplace(
  getRule: (unit: string) => ConversionRule | undefined,
  unitPrecision: number,
  minValue: number,
  keepZeroUnit: boolean,
  normalizeUnitCase: boolean,
  context: Omit<RuleContext, 'fromUnit' | 'rawUnit' | 'rawValue' | 'match'>,
) {
  const shouldRound = unitPrecision >= 0 && unitPrecision <= 100

  return function replace(m: string, $1?: string, $2?: string) {
    if (!$1 || !$2) {
      return m
    }

    const value = Number($1)
    if (Number.isNaN(value)) {
      return m
    }

    const rawUnit = $2
    const fromUnit = normalizeUnitCase ? rawUnit.toLowerCase() : rawUnit
    const rule = getRule(fromUnit)
    if (!rule) {
      return m
    }

    const effectiveMinValue = rule.minValue ?? minValue
    if (value < effectiveMinValue) {
      return m
    }

    const ruleContext: RuleContext = {
      ...context,
      fromUnit,
      match: m,
      rawUnit,
      rawValue: $1,
    }

    const fallbackUnit = rule.to ?? fromUnit
    const normalized = normalizeTransformResult(
      typeof rule.transform === 'function'
        ? rule.transform(value, ruleContext)
        : typeof rule.factor === 'number'
          ? value * rule.factor
          : undefined,
      fallbackUnit,
    )

    if (!normalized) {
      return m
    }

    const roundedValue = shouldRound ? toFixed(normalized.value, unitPrecision) : normalized.value
    if (roundedValue === 0 && !keepZeroUnit) {
      return '0'
    }

    return `${roundedValue}${normalized.unit}`
  }
}

const plugin: PostcssUnitConverter = (options: UserDefinedOptions = {}) => {
  const resolved = getConfig(options)
  const {
    rules,
    unitRegex: customUnitRegex,
    unitPrecision,
    minValue,
    keepZeroUnit,
    selectorBlackList,
    propList,
    replace,
    mediaQuery,
    exclude,
    disabled,
  } = resolved

  if (disabled || rules.length === 0) {
    return { postcssPlugin }
  }

  const { entries, stringRules, hasComplexMatcher } = normalizeRules(rules)
  if (entries.length === 0) {
    return { postcssPlugin }
  }

  let unitRegex: RegExp
  let getRule: (unit: string) => ConversionRule | undefined
  let normalizeUnitCase = true

  if (customUnitRegex) {
    if (countCapturingGroups(customUnitRegex.source) < 2) {
      throw new TypeError('unitRegex must provide numeric and unit capture groups')
    }
    unitRegex = customUnitRegex
    getRule = unit => getMatcherRuleWithStrings(entries, unit, stringRules)
  }
  else if (hasComplexMatcher) {
    unitRegex = createAnyUnitRegex()
    getRule = unit => getMatcherRuleWithStrings(entries, unit, stringRules)
  }
  else {
    const units = Array.from(stringRules?.keys() ?? []).sort((a, b) => b.length - a.length)
    if (units.length === 0) {
      return { postcssPlugin }
    }
    unitRegex = createUnitRegex(units)
    getRule = unit => stringRules?.get(unit)?.rule
    normalizeUnitCase = false
  }

  return {
    postcssPlugin,
    Once(css) {
      type SharedWalkAndReplaceOptions = Parameters<typeof walkAndReplaceValues>[0]
      // A declaration often contains the same unit several times (for example
      // `margin: 1rem 2rem 1rem 2rem`). Complex matchers have to scan the
      // ordered rule list, so resolve each distinct unit once per PostCSS root.
      // Keep this cache local to the traversal: matcher callbacks may depend on
      // the current build and must not leak results into a later file.
      const resolvedRules = new Map<string, ConversionRule | undefined>()
      const resolveRule = (unit: string) => {
        if (resolvedRules.has(unit)) {
          return resolvedRules.get(unit)
        }
        const rule = getRule(unit)
        resolvedRules.set(unit, rule)
        return rule
      }
      const walkOptions: SharedWalkAndReplaceOptions = {
        root: css as unknown as SharedWalkAndReplaceOptions['root'],
        unitRegex,
        propList,
        selectorBlackList,
        exclude,
        replace,
        mediaQuery,
        createReplacer: (context) => {
          return createReplace(
            resolveRule,
            unitPrecision,
            minValue,
            keepZeroUnit,
            normalizeUnitCase,
            context,
          )
        },
        shouldProcessAtRule: atRule => atRule.name === 'media',
      }
      walkAndReplaceValues(walkOptions)
    },
  }
}

plugin.postcss = true

export default plugin
