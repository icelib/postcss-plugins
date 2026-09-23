import type { Rule } from 'postcss'

function escapeRegExp(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, String.raw`\$&`)
}

/**
 * Check whether a selector matches any blacklist rule.
 *
 * @example
 * blacklistedSelector(['.ignore', /\\.skip-/], '.ignore .btn') // true
 */
export function blacklistedSelector(
  blacklist: readonly (string | RegExp)[],
  selector?: string,
) {
  if (typeof selector !== 'string') {
    return false
  }
  return blacklist.some((rule) => {
    if (typeof rule === 'string') {
      return selector.includes(rule)
    }
    return Boolean(selector.match(rule))
  })
}

/**
 * Check whether a selector is blacklisted; returns undefined for non-string selectors.
 *
 * @example
 * maybeBlacklistedSelector(['.ignore'], '.ignore .btn') // true
 */
export function maybeBlacklistedSelector(
  blacklist: readonly (string | RegExp)[],
  selector?: string,
): boolean | undefined {
  if (typeof selector !== 'string') {
    return undefined
  }
  return blacklistedSelector(blacklist, selector)
}

/**
 * Options for selector blacklist matcher creation.
 *
 * @default { cache: true }
 */
export interface SelectorBlacklistMatcherOptions {
  cache?: boolean
}

/**
 * Create a matcher that checks whether a Rule selector is blacklisted.
 *
 * @example
 * const isBlacklisted = createSelectorBlacklistMatcher(['.ignore'])
 * isBlacklisted(rule)
 */
export function createSelectorBlacklistMatcher(
  blacklist: readonly (string | RegExp)[],
  options: SelectorBlacklistMatcherOptions = {},
) {
  const useCache = options.cache ?? true
  const cache = useCache ? new WeakMap<Rule, boolean>() : undefined

  return function isBlacklisted(rule: Rule) {
    if (blacklist.length === 0) {
      return false
    }
    if (cache) {
      const cached = cache.get(rule)
      if (cached !== undefined) {
        return cached
      }
      const value = Boolean(maybeBlacklistedSelector(blacklist, rule.selector))
      cache.set(rule, value)
      return value
    }
    return Boolean(maybeBlacklistedSelector(blacklist, rule.selector))
  }
}

/**
 * Create a matcher that checks whether a declaration property is included.
 *
 * @example
 * const matchProp = createPropListMatcher(['font', /size/])
 * matchProp('font-size') // true
 */
function createStringRuleMatcher(rule: string, mode: 'negative' | 'positive') {
  if (rule.includes('*')) {
    const globRegex = new RegExp(`^${escapeRegExp(rule).replaceAll('\\*', '.*')}$`)
    return function matchGlob(prop: string) {
      return globRegex.test(prop)
    }
  }

  if (mode === 'negative') {
    return function matchExact(prop: string) {
      return prop === rule
    }
  }

  return function matchContains(prop: string) {
    return prop.includes(rule)
  }
}

export function createPropListMatcher(propList: readonly (string | RegExp)[]) {
  const hasWild = propList.includes('*')
  const positiveRules = propList.filter((rule) => {
    return typeof rule !== 'string' || !rule.startsWith('!')
  })
  const negativeRules = propList.filter((rule): rule is string => {
    return typeof rule === 'string' && rule.startsWith('!')
  })
  const positiveStringMatchers = positiveRules
    .filter((rule): rule is string => typeof rule === 'string' && rule !== '*')
    .map(rule => createStringRuleMatcher(rule, 'positive'))
  const positiveRegexRules = positiveRules
    .filter((rule): rule is RegExp => rule instanceof RegExp)
  const negativeMatchers = negativeRules
    .map(rule => createStringRuleMatcher(rule.substring(1), 'negative'))

  return function satisfyPropList(prop: string) {
    if (hasWild && negativeRules.length === 0) {
      return true
    }

    const shouldInclude = hasWild
      || positiveStringMatchers.some(match => match(prop))
      || positiveRegexRules.some(rule => Boolean(prop.match(rule)))

    const shouldExclude = negativeMatchers.some(match => match(prop))

    return shouldInclude && !shouldExclude
  }
}

/**
 * Create a matcher that supports advanced prop list patterns.
 *
 * @example
 * const matchProp = createAdvancedPropListMatcher(['*', '!border*'])
 * matchProp('padding') // true
 * matchProp('border-color') // false
 */
function createAdvancedStringRuleMatcher(rule: string) {
  if (rule.includes('*')) {
    const globRegex = new RegExp(`^${escapeRegExp(rule).replaceAll('\\*', '.*')}$`)
    return function matchGlob(prop: string) {
      return globRegex.test(prop)
    }
  }

  return function matchExact(prop: string) {
    return prop === rule
  }
}

export function createAdvancedPropListMatcher(propList: readonly string[]) {
  const hasWild = propList.includes('*')
  const matchAll = hasWild && propList.length === 1
  const positiveMatchers = propList
    .filter(rule => rule !== '*' && !rule.startsWith('!'))
    .map(rule => createAdvancedStringRuleMatcher(rule))
  const negativeMatchers = propList
    .filter(rule => rule.startsWith('!'))
    .map(rule => createAdvancedStringRuleMatcher(rule.substring(1)))

  return function satisfyPropList(prop: string) {
    if (matchAll) {
      return true
    }

    const shouldInclude = (
      hasWild
      || positiveMatchers.some(match => match(prop))
    )

    const shouldExclude = negativeMatchers.some(match => match(prop))

    return shouldInclude && !shouldExclude
  }
}

/**
 * Create a matcher that checks whether a file path is excluded.
 *
 * @example
 * const isExcluded = createExcludeMatcher([/node_modules/])
 * isExcluded('/project/node_modules/foo.css') // true
 */
export function createExcludeMatcher(
  exclude: readonly (string | RegExp)[] | ((filePath: string) => boolean),
) {
  return function isExcluded(filepath: string | undefined) {
    if (filepath === undefined) {
      return false
    }
    if (typeof exclude === 'function') {
      return exclude(filepath)
    }
    return exclude.some((rule) => {
      if (typeof rule === 'string') {
        return filepath.includes(rule)
      }
      return Boolean(filepath.match(rule))
    })
  }
}
