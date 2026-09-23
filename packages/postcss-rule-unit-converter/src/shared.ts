import type { ConversionRule, RuleContext, RuleGroup, UserDefinedOptions } from './types'
import {
  createConfigGetter,
  createExcludeMatcher,
  createPropListMatcher,
  createSelectorBlacklistMatcher,
  declarationExists,
  toFixed,
  walkAndReplaceValues,
} from 'postcss-plugin-shared'
import { name as packageName } from '../package.json'
import { defaultOptions } from './defaults'

const DEFAULT_NUMBER_PATTERN = String.raw`\d+(?:\.\d+)?|\.\d+`

export const postcssPlugin = packageName

export const getConfig = createConfigGetter(defaultOptions)

export function createUnitRegex(units: readonly string[]) {
  // Match longer units first so overlapping units such as `p` and `px` do
  // not consume a valid value partially (`1px` -> `1p` + `x`).
  const unitPart = [...units]
    .sort((left, right) => right.length - left.length)
    .map(unit => unit.replace(/[\\^$.*+?()[\]{}|]/g, String.raw`\$&`))
    .join('|')
  const parts: string[] = [
    String.raw`"[^"]+"`,
    String.raw`'[^']+'`,
    String.raw`url\([^)]+\)`,
    String.raw`var\((?:[^()]|\([^()]*\))*\)`,
    String.raw`(${DEFAULT_NUMBER_PATTERN})(${unitPart})`,
  ]
  return new RegExp(parts.join('|'), 'g')
}

export function createAnyUnitRegex() {
  const parts: string[] = [
    String.raw`"[^"]+"`,
    String.raw`'[^']+'`,
    String.raw`url\([^)]+\)`,
    String.raw`var\((?:[^()]|\([^()]*\))*\)`,
    // CSS dimension units are identifiers. Keep the broad matcher permissive
    // enough for custom units such as `u2`, while retaining `%` support.
    String.raw`(${DEFAULT_NUMBER_PATTERN})([a-zA-Z%-][\w%-]*)`,
  ]
  return new RegExp(parts.join('|'), 'g')
}

function isRuleGroupArray(group: RuleGroup): group is readonly ConversionRule[] {
  return Array.isArray(group)
}

export function composeRules(...groups: RuleGroup[]): ConversionRule[] {
  const rules: ConversionRule[] = []
  for (const group of groups) {
    if (isRuleGroupArray(group)) {
      rules.push(...group)
      continue
    }
    rules.push(group)
  }
  return rules
}

export function resolveNumericValue(
  value: number | ((input: import('postcss').Input) => number),
  input: import('postcss').Input,
) {
  return typeof value === 'function' ? value(input) : value
}

export {
  createExcludeMatcher,
  createPropListMatcher,
  createSelectorBlacklistMatcher,
  declarationExists,
  toFixed,
  walkAndReplaceValues,
}

export type { RuleContext, UserDefinedOptions }
