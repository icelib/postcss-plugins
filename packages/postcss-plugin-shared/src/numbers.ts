/**
 * Round a number with fixed precision while preserving the sign.
 *
 * @example
 * toFixed(1.005, 2) // 1.01
 */
export function toFixed(number: number, precision: number) {
  if (number === 0) {
    return 0
  }
  const multiplier = 10 ** precision
  const sign = Math.sign(number)
  const absNumber = Math.abs(number)
  // A fixed EPSILON can overwhelm very small lengths. Use a relative
  // correction below that magnitude, preserving ordinary decimal rounding.
  const correction = absNumber < Number.EPSILON ? Number.EPSILON * absNumber : Number.EPSILON
  const correctedNumber = absNumber + correction
  const scaledNumber = correctedNumber * multiplier
  // Scaling large finite lengths can overflow even though no fractional
  // digits remain to round at the requested precision.
  if (Number.isFinite(number) && !Number.isFinite(scaledNumber)) {
    return number
  }
  const rounded = Math.round(scaledNumber) / multiplier
  return sign * rounded
}
