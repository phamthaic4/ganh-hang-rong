import Decimal from 'break_infinity.js'

const SMALL_SUFFIXES = ['', 'K', 'M', 'B', 'T']
/** Số bậc tối đa có hậu tố chữ: 5 bậc nhỏ + 26×26 cặp aa..zz. */
const MAX_TIER = 5 + 26 * 26 - 1

function suffixFor(tier: number): string {
  if (tier < SMALL_SUFFIXES.length) return SMALL_SUFFIXES[tier]
  const i = tier - SMALL_SUFFIXES.length
  return String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + (i % 26))
}

/** Định dạng số lớn kiểu idle: 999, 1.23K, 4.56aa, 1.00e12345. */
export function formatNumber(value: Decimal): string {
  if (value.lt(0)) return '-' + formatNumber(value.neg())
  if (value.lt(1000)) return value.floor().toString()

  // break_infinity biểu diễn giá trị dạng m × 10^e (getter .m / .e).
  const exponent = value.e
  const tier = Math.floor(exponent / 3)
  if (tier > MAX_TIER) {
    return value.m.toFixed(2) + 'e' + exponent
  }
  let scaled = value.m * Math.pow(10, exponent - tier * 3)
  if (scaled >= 999.995) {
    scaled /= 1000
    return scaled.toFixed(2) + suffixFor(tier + 1)
  }
  return scaled.toFixed(2) + suffixFor(tier)
}
