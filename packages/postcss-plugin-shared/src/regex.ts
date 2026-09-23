// excluding regex trick: http://www.rexegg.com/regex-best-trick.html

/**
 * Options for creating a unit-matching regex.
 *
 * Defaults:
 * - numberPattern: `\\d+(?:\\.\\d+)?|\\.\\d+`
 * - skipDoubleQuotes: true
 * - skipSingleQuotes: true
 * - skipUrl: true
 * - skipVar: true
 * - ignoreCase: false
 *
 * @example
 * const regex = createUnitRegex({ units: ['rem', 'vw'] })
 */
export interface UnitRegexOptions {
  units: readonly string[]
  numberPattern?: string
  skipDoubleQuotes?: boolean
  skipSingleQuotes?: boolean
  skipUrl?: boolean
  skipVar?: boolean
  ignoreCase?: boolean
}

/**
 * Build a regex that matches numeric values with specific units, while
 * skipping quoted strings, url(...), and var(...).
 *
 * @example
 * const regex = createUnitRegex({ units: ['px'] })
 * '1px 2px'.replace(regex, (m) => m)
 */
export function createUnitRegex(options: UnitRegexOptions) {
  const {
    units,
    numberPattern = String.raw`\d+(?:\.\d+)?|\.\d+`,
    skipDoubleQuotes = true,
    skipSingleQuotes = true,
    skipUrl = true,
    skipVar = true,
    ignoreCase = false,
  } = options

  const parts: string[] = []
  if (skipDoubleQuotes) {
    parts.push(String.raw`"[^"]+"`)
  }
  if (skipSingleQuotes) {
    parts.push(String.raw`'[^']+'`)
  }
  if (skipUrl) {
    parts.push(String.raw`url\([^)]+\)`)
  }
  if (skipVar) {
    // Keep units inside common nested fallbacks such as
    // `var(--gap, calc(1rem + 2px))` out of the conversion pass.
    parts.push(String.raw`var\((?:[^()]|\([^()]*\))*\)`)
  }

  const unitPart = [...units]
    .sort((left, right) => right.length - left.length)
    .map(unit => unit.replace(/[\\^$.*+?()[\]{}|]/g, String.raw`\$&`))
    .join('|')
  parts.push(String.raw`(${numberPattern})(?:${unitPart})`)

  return new RegExp(parts.join('|'), `g${ignoreCase ? 'i' : ''}`)
}

/**
 * Regex matching rem values with the default unit regex options.
 *
 * @example
 * remRegex.test('1rem')
 */
export const remRegex
  = createUnitRegex({ units: ['rem'] })

/**
 * Regex matching px values with the default unit regex options.
 *
 * @example
 * pxRegex.test('1px')
 */
export const pxRegex
  = createUnitRegex({ units: ['px'] })
