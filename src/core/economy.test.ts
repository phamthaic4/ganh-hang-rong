import { describe, expect, it } from 'vitest'
import Decimal from 'break_infinity.js'
import type { StallDef } from './types'
import { createInitialState } from './state'
import {
  bulkCost,
  buyHelper,
  buyStall,
  costOf,
  cycleIncome,
  globalMilestoneMultiplier,
  incomePerSec,
  maxBuyCount,
  stallMilestoneMultiplier,
} from './economy'

const XOI: StallDef = {
  id: 'xoi',
  name: 'Xôi lạc',
  baseCost: 4,
  growth: 1.07,
  baseIncome: 1,
  cycleSec: 1,
  helperCost: 50,
}
const BANHMI: StallDef = {
  id: 'banhmi',
  name: 'Bánh mì',
  baseCost: 60,
  growth: 1.15,
  baseIncome: 60,
  cycleSec: 3,
  helperCost: 1000,
}
const STALLS = [XOI, BANHMI]

describe('costOf — công thức giá', () => {
  it('floor(baseCost × growth^n)', () => {
    expect(costOf(XOI, 0).toNumber()).toBe(4)
    expect(costOf(XOI, 1).toNumber()).toBe(Math.floor(4 * 1.07)) // 4.28 → 4
    expect(costOf(XOI, 10).toNumber()).toBe(Math.floor(4 * Math.pow(1.07, 10)))
    expect(costOf(BANHMI, 0).toNumber()).toBe(60)
  })

  it('không tràn ở mức mua rất cao', () => {
    const cost = costOf(XOI, 5000)
    expect(Number.isFinite(cost.m)).toBe(true)
    expect(cost.gt(0)).toBe(true)
  })
})

describe('bulkCost — mua nhiều bằng tổng cấp số nhân', () => {
  it('from=0, count=1 trùng giá đơn lẻ', () => {
    expect(bulkCost(XOI, 0, 1).eq(costOf(XOI, 0))).toBe(true)
  })

  it('sai số so với tổng từng cái luôn dưới `count` (do floor)', () => {
    const count = 20
    let sum = new Decimal(0)
    for (let i = 0; i < count; i++) sum = sum.add(costOf(XOI, i))
    const diff = bulkCost(XOI, 0, count).sub(sum).abs().toNumber()
    expect(diff).toBeLessThanOrEqual(count)
  })

  it('count = 0 trả 0', () => {
    expect(bulkCost(XOI, 5, 0).toNumber()).toBe(0)
  })
})

describe('maxBuyCount', () => {
  it('đúng biên: mua k cái, không đủ k+1', () => {
    const money = new Decimal(55)
    const k = maxBuyCount(XOI, 0, money)
    expect(k).toBeGreaterThan(0)
    expect(bulkCost(XOI, 0, k).lte(money)).toBe(true)
    expect(bulkCost(XOI, 0, k + 1).gt(money)).toBe(true)
  })

  it('không đủ tiền mua 1 cái thì trả 0', () => {
    expect(maxBuyCount(XOI, 0, new Decimal(3))).toBe(0)
  })

  it('tiền khổng lồ vẫn ra đúng biên', () => {
    const money = new Decimal('1e300')
    const from = 123
    const k = maxBuyCount(XOI, from, money)
    expect(bulkCost(XOI, from, k).lte(money)).toBe(true)
    expect(bulkCost(XOI, from, k + 1).gt(money)).toBe(true)
  })
})

describe('mốc nhân đôi', () => {
  it('mốc riêng của quầy: 25, 50, 100, 200, 300, 400', () => {
    expect(stallMilestoneMultiplier(24)).toBe(1)
    expect(stallMilestoneMultiplier(25)).toBe(2)
    expect(stallMilestoneMultiplier(49)).toBe(2)
    expect(stallMilestoneMultiplier(50)).toBe(4)
    expect(stallMilestoneMultiplier(100)).toBe(8)
    expect(stallMilestoneMultiplier(200)).toBe(16)
    expect(stallMilestoneMultiplier(300)).toBe(32)
    expect(stallMilestoneMultiplier(400)).toBe(64)
    expect(stallMilestoneMultiplier(1000)).toBe(64)
  })

  it('mốc toàn cục cần MỌI quầy đạt ngưỡng', () => {
    const state = createInitialState([XOI, BANHMI])
    expect(globalMilestoneMultiplier([XOI, BANHMI], state)).toBe(1)
    state.stalls.xoi.count = 25
    expect(globalMilestoneMultiplier([XOI, BANHMI], state)).toBe(1)
    state.stalls.banhmi.count = 25
    expect(globalMilestoneMultiplier([XOI, BANHMI], state)).toBe(2)
    state.stalls.xoi.count = 50
    state.stalls.banhmi.count = 49
    expect(globalMilestoneMultiplier([XOI, BANHMI], state)).toBe(2)
    state.stalls.banhmi.count = 50
    expect(globalMilestoneMultiplier([XOI, BANHMI], state)).toBe(4)
  })
})

describe('thu nhập', () => {
  it('cycleIncome = baseIncome × count × mốc', () => {
    const state = createInitialState(STALLS)
    state.stalls.xoi.count = 10
    expect(cycleIncome(state, STALLS, 'xoi').toNumber()).toBe(10)
    state.stalls.xoi.count = 25
    expect(cycleIncome(state, STALLS, 'xoi').toNumber()).toBe(50)
    expect(cycleIncome(state, STALLS, 'banhmi').toNumber()).toBe(0)
  })

  it('incomePerSec chỉ tính quầy có người phụ', () => {
    const state = createInitialState(STALLS)
    state.stalls.xoi.count = 1
    state.stalls.banhmi.count = 1
    expect(incomePerSec(state, STALLS).toNumber()).toBe(0)
    state.stalls.xoi.helper = true
    expect(incomePerSec(state, STALLS).toNumber()).toBe(1)
    state.stalls.banhmi.helper = true
    expect(incomePerSec(state, STALLS).toNumber()).toBe(1 + 60 / 3)
  })
})

describe('mua', () => {
  it('buyStall qty cố định trừ đúng số tiền', () => {
    const state = createInitialState(STALLS)
    state.money = new Decimal(100)
    const bought = buyStall(state, STALLS, 'xoi', 5)
    expect(bought).toBe(5)
    expect(state.stalls.xoi.count).toBe(5)
    expect(state.money.eq(100 - bulkCost(XOI, 0, 5).toNumber())).toBe(true)
  })

  it('buyStall không đủ tiền thì không mua, tiền giữ nguyên', () => {
    const state = createInitialState(STALLS)
    state.money = new Decimal(5) // chỉ đủ 1 cái, gọi mua 5
    expect(buyStall(state, STALLS, 'xoi', 5)).toBe(0)
    expect(state.stalls.xoi.count).toBe(0)
    expect(state.money.toNumber()).toBe(5)
  })

  it("buyStall 'max' mua hết khả năng", () => {
    const state = createInitialState(STALLS)
    state.money = new Decimal(1000)
    const bought = buyStall(state, STALLS, 'xoi', 'max')
    expect(bought).toBe(maxBuyCount(XOI, 0, new Decimal(1000)))
    expect(state.money.toNumber()).toBeLessThan(costOf(XOI, bought).toNumber())
  })

  it('buyHelper trừ đúng giá, chỉ mua một lần', () => {
    const state = createInitialState(STALLS)
    state.money = new Decimal(49)
    state.stalls.xoi.count = 1
    expect(buyHelper(state, STALLS, 'xoi')).toBe(false)
    state.money = new Decimal(50)
    expect(buyHelper(state, STALLS, 'xoi')).toBe(true)
    expect(state.money.toNumber()).toBe(0)
    expect(buyHelper(state, STALLS, 'xoi')).toBe(false)
  })
})
