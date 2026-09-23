// excluding regex trick: http://www.rexegg.com/regex-best-trick.html
//
// Not anything inside double quotes
// Not anything inside single quotes
// Not anything inside url()
// Any digit followed by units

const NUMBER_PATTERN = String.raw`\d*\.?\d+`

/**
 * Build a px-matching regex with optional unit list.
 *
 * Defaults:
 * - units: ['px']
 * - numberPattern: `\\d*\\.?\\d+`
 * - skipVar: true
 *
 * @example
 * const regex = pxRegex(['px', 'rpx'])
 * '1px 2rpx'.replace(regex, (m) => m)
 */
export function pxRegex(units: string[] = ['px']) {
  const unitPart = [...units]
    .sort((left, right) => right.length - left.length)
    .map(unit => unit.replace(/[\\^$.*+?()[\]{}|]/g, String.raw`\$&`))
    .join('|')
  const parts: string[] = [
    String.raw`"[^"]+"`,
    String.raw`'[^']+'`,
    String.raw`url\([^)]+\)`,
    String.raw`var\((?:[^()]|\([^()]*\))*\)`,
    String.raw`(${NUMBER_PATTERN})(${unitPart})`,
  ]
  return new RegExp(parts.join('|'), 'g')
}
