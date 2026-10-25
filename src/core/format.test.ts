import { describe, expect, it } from 'vitest'
import Decimal from 'break_infinity.js'
import { formatNumber } from './format'

describe('formatNumber — K, M, B, T, aa, ab…', () => {
  it('dưới 1000 hiển thị nguyên', () => {
    expect(formatNumber(new Decimal(0))).toBe('0')
    expect(formatNumber(new Decimal(999))).toBe('999')
    expect(formatNumber(new Decimal(999.99))).toBe('999')
  })

  it('bậc K, M, B, T', () => {
    expect(formatNumber(new Decimal(1000))).toBe('1.00K')
    expect(formatNumber(new Decimal(1234))).toBe('1.23K')
    expect(formatNumber(new Decimal(1e6))).toBe('1.00M')
    expect(formatNumber(new Decimal('1.5e9'))).toBe('1.50B')
    expect(formatNumber(new Decimal('2.34e12'))).toBe('2.34T')
  })

  it('lăn bậc khi scaled tới 1000', () => {
    expect(formatNumber(new Decimal(999999))).toBe('1.00M')
    expect(formatNumber(new Decimal(999999999))).toBe('1.00B')
  })

  it('sau T là aa, ab, ac… (mỗi bậc ×1000)', () => {
    expect(formatNumber(new Decimal(1e15))).toBe('1.00aa')
    expect(formatNumber(new Decimal(1e18))).toBe('1.00ab')
    expect(formatNumber(new Decimal('1.23e21'))).toBe('1.23ac')
    expect(formatNumber(new Decimal(1e81))).toBe('1.00aw')
  })

  it('hết cặp chữ thì chuyển sang mũ e', () => {
    const huge = new Decimal('1e2106') // vượt aa..zz
    expect(formatNumber(huge)).toBe('1.00e2106')
  })

  it('số âm', () => {
    expect(formatNumber(new Decimal(-1234))).toBe('-1.23K')
  })
})
