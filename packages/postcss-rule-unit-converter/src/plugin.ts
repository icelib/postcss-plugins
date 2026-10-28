import type {
  ConversionRule,
  PostcssUnitConverter,
  RuleContext,
  UnitMatcher,
  UserDefinedOptions,
} from './types'
import { Input } from 'postcss'
import {
  getConfig,
  postcssPlugin,
  toFixed,
  walkAndReplaceValues,
} from './shared'
import { createValueTransformer } from './tokenize'

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

  const stringRules = new Map<string, StringMatcherEntry>()
  for (const entry of entries) {
    if (entry.type === 'string' && !stringRules.has(entry.unit)) {
      stringRules.set(entry.unit, entry)
    }
  }

  return {
    entries,
    stringRules,
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
  context: Omit<RuleContext, 'fromUnit' | 'rawUnit' | 'rawValue' | 'match'>,
) {
  const shouldRound = unitPrecision >= 0 && unitPrecision <= 100

  return function replace(m: string, $1?: string, $2?: string, decodedUnit = $2) {
    if (!$1 || !$2) {
      return m
    }

    const value = Number($1)
    if (!Number.isFinite(value)) {
      return m
    }

    const rawUnit = $2
    const fromUnit = decodedUnit!.toLowerCase()
    const rule = getRule(fromUnit)
    if (!rule) {
      return m
    }

    const effectiveMinValue = rule.minValue ?? minValue
    if (Math.abs(value) < effectiveMinValue) {
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

    const sign = $1.startsWith('+') && roundedValue >= 0 ? '+' : ''
    return `${sign}${roundedValue}${normalized.unit}`
  }
}

const plugin: PostcssUnitConverter = (options: UserDefinedOptions = {}) => {
  const resolved = getConfig(options)
  const {
    rules,
    unitRegex: customUnitRegex,
    transformVarFallbacks,
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

  const { entries, stringRules } = normalizeRules(rules)
  if (entries.length === 0) {
    return { postcssPlugin }
  }

  if (customUnitRegex) {
    if (countCapturingGroups(customUnitRegex.source) < 2) {
      throw new TypeError('unitRegex must provide numeric and unit capture groups')
    }
  }

  return {
    postcssPlugin,
    Once(css, helpers) {
      // Older wrappers call this hook directly. Without either a source Input
      // or native PostCSS helpers, retain their historical no-op behavior.
      if (!css.source?.input && !helpers) {
        return
      }
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
        const rule = getMatcherRuleWithStrings(entries, unit, stringRules)
        resolvedRules.set(unit, rule)
        return rule
      }
      const walkOptions: SharedWalkAndReplaceOptions = {
        root: css as unknown as SharedWalkAndReplaceOptions['root'],
        // Programmatic ASTs may have no source. Supply callback/filter context
        // without attaching invented mapping metadata to any AST node.
        input: css.source?.input ?? new Input(css.toString(), { from: helpers.result.opts.from, map: false }),
        propList,
        selectorBlackList,
        exclude,
        replace,
        mediaQuery,
        shouldProcessAtRule: atRule => atRule.name === 'media',
      }
      const createConverter = (context: Parameters<typeof createReplace>[4]) => createReplace(
        resolveRule,
        unitPrecision,
        minValue,
        keepZeroUnit,
        context,
      )
      if (customUnitRegex) {
        walkOptions.unitRegex = customUnitRegex
        walkOptions.createReplacer = (context) => {
          const convert = createConverter(context)
          // String#replace passes an offset after the captured unit; do not
          // confuse that argument with the decoded CSS unit used by tokens.
          return (match: string, rawValue?: string, rawUnit?: string) => convert(match, rawValue, rawUnit)
        }
      }
      else {
        walkOptions.createValueTransformer = context => createValueTransformer(createConverter(context), transformVarFallbacks)
      }
      walkAndReplaceValues(walkOptions)
    },
  }
}

plugin.postcss = true

export default plugin
