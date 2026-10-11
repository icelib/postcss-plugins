import type { Input, PluginCreator } from 'postcss'
import type { ReplaceContext } from 'postcss-plugin-shared'

/**
 * Matcher used to decide whether a conversion rule applies to a unit.
 */
export type UnitMatcher = string | RegExp | ((unit: string) => boolean)

/**
 * Extra context passed to conversion callbacks.
 */
export interface RuleContext extends ReplaceContext {
  /** CSS-decoded unit, normalized to lowercase. */
  fromUnit: string
  /** Original unit spelling, including CSS escapes and letter case. */
  rawUnit: string
  /** Original number spelling, including its sign and exponent. */
  rawValue: string
  match: string
}

/**
 * Explicit conversion result returned from a transform callback.
 */
export interface ConvertedValue {
  value: number
  unit?: string
}

/**
 * Per-unit conversion callback used by `presets.unitsToPx`.
 */
export type UnitTransform = (
  /** Signed numeric value from the CSS token. */
  value: number,
  context: RuleContext,
) => number | ConvertedValue | undefined

/**
 * Fallback conversion callback used by `presets.unitsToPx`.
 */
export type GlobalUnitTransform = (
  value: number,
  unit: string,
  context: RuleContext,
) => number | ConvertedValue | undefined

/**
 * Per-unit conversion rule used by `presets.unitsToPx`.
 */
export type UnitRule = number | UnitTransform | null | false

/**
 * Per-unit conversion map used by `presets.unitsToPx`.
 */
export type UnitMap
  = Record<string, UnitRule>
    | Map<UnitMatcher, UnitRule>
    | Array<[UnitMatcher, UnitRule]>

/**
 * Callback-based conversion rule.
 */
export type RuleTransform = UnitTransform

/**
 * Single conversion rule.
 *
 * Rules are matched in order. If multiple rules can match the same source
 * unit, the first one wins, even if it declines conversion. Results are not
 * matched against subsequent rules in the same pass; another plugin run can
 * convert them again.
 */
export interface ConversionRule {
  from: UnitMatcher
  to?: string
  factor?: number
  /** Minimum absolute magnitude of the original value. */
  minValue?: number
  transform?: RuleTransform
}

export type RuleGroup = ConversionRule | readonly ConversionRule[]
export type PresetOptions = Record<string, unknown> | undefined
export type PresetFactory<TOptions extends PresetOptions = undefined> = (
  options?: TOptions,
) => ConversionRule
export type PresetGroupFactory<TOptions extends PresetOptions = undefined> = (
  options?: TOptions,
) => ConversionRule[]

/**
 * Numeric option that can be resolved dynamically from the current PostCSS input.
 */
export type NumericResolver = number | ((input: Input) => number)

/**
 * Plugin options.
 */
export interface UserDefinedOptions {
  rules?: readonly ConversionRule[]
  /**
   * Override CSS tokenization with custom numeric and unit capture groups.
   * The expression controls its own token boundaries and protected functions.
   */
  unitRegex?: RegExp | undefined
  unitPrecision?: number
  /** Minimum absolute magnitude of the original value. Defaults to 0. */
  minValue?: number
  keepZeroUnit?: boolean
  selectorBlackList?: readonly (string | RegExp)[]
  /**
   * Supports negated string entries like `!font-size`, `!padding*`,
   * or glob patterns such as `!--wot-*-font-size`.
   */
  propList?: readonly (string | RegExp)[]
  replace?: boolean
  mediaQuery?: boolean
  /**
   * Excludes the stylesheet using its root input path. Imported declarations
   * retain their own source in context.decl.source for per-source callbacks.
   */
  exclude?: readonly (string | RegExp)[] | ((filePath: string) => boolean)
  disabled?: boolean
}

export type PostcssUnitConverter = PluginCreator<UserDefinedOptions>
