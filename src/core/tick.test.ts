import { describe, expect, it } from 'vitest'
import Decimal from 'break_infinity.js'
import type { StallDef } from './types'
import { createInitialState } from './state'
import { buyHelper, buyStall, bulkCost } from './economy'
import { HELPED_TAP_SHARE, TAP_REWARD_PER_SEC, advance, tapStall, tick } from './tick'

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

function newState(money = 0) {
  const state = createInitialState(STALLS)
  state.money = new Decimal(money)
  return state
}

describe('advance — thu nhập tự động', () => {
  it('quầy có người phụ hoàn thành đúng số chu kỳ', () => {
    const state = newState(1000)
    buyStall(state, STALLS, 'xoi', 10)
    buyHelper(state, STALLS, 'xoi') // 10 unit × 1 tiền/chu kỳ, chu kỳ 1s
    const earned = advance(state, STALLS, 2.5)
    expect(earned.toNumber()).toBe(20) // 2 chu kỳ × 10 unit
    expect(state.stalls.xoi.progress).toBeCloseTo(0.5, 5)
    expect(state.money.toNumber()).toBe(1000 - bulkCost(XOI, 0, 10).toNumber() - 50 + 20)
  })

  it('quầy không người phụ không tự chạy', () => {
    const state = newState(100)
    buyStall(state, STALLS, 'xoi', 10)
    expect(advance(state, STALLS, 10).toNumber()).toBe(0)
  })

  it('mốc nhân đôi áp vào thu nhập tự động', () => {
    const state = newState(1e9)
    buyStall(state, STALLS, 'xoi', 25) // ×2 mốc quầy
    buyHelper(state, STALLS, 'xoi')
    expect(advance(state, STALLS, 1).toNumber()).toBe(50)
  })

  it('dt âm hoặc 0 trả 0', () => {
    const state = newState(1e9)
    buyStall(state, STALLS, 'xoi', 5)
    buyHelper(state, STALLS, 'xoi')
    expect(advance(state, STALLS, -5).toNumber()).toBe(0)
    expect(advance(state, STALLS, 0).toNumber()).toBe(0)
  })

  it('chu kỳ dài không hoàn thành sớm', () => {
    const state = newState(1e9)
    buyStall(state, STALLS, 'banhmi', 1)
    buyHelper(state, STALLS, 'banhmi')
    expect(advance(state, STALLS, 2.9).toNumber()).toBe(0)
    expect(advance(state, STALLS, 0.1).toNumber()).toBe(60)
  })
})

describe('tick — theo timestamp thực', () => {
  it('dt tính từ lastTickAt và cập nhật lại', () => {
    const state = newState(1e9)
    state.lastTickAt = 1000
    buyStall(state, STALLS, 'xoi', 5)
    buyHelper(state, STALLS, 'xoi')
    tick(state, STALLS, 3500) // 2.5s
    expect(state.lastTickAt).toBe(3500)
    expect(state.stalls.xoi.progress).toBeCloseTo(0.5, 5)
  })

  it('đồng hồ lùi thì bỏ qua, không âm tiền', () => {
    const state = newState(1e9)
    state.lastTickAt = 5000
    expect(tick(state, STALLS, 4000).toNumber()).toBe(0)
    expect(state.lastTickAt).toBe(5000)
  })
})

describe('tapStall — chạm', () => {
  it('quầy chưa có người phụ: chạm hoàn thành một chu kỳ', () => {
    const state = newState(1000)
    buyStall(state, STALLS, 'xoi', 10)
    const reward = tapStall(state, STALLS, 'xoi', 1000)
    expect(reward.toNumber()).toBe(10)
    expect(state.money.toNumber()).toBe(1000 - bulkCost(XOI, 0, 10).toNumber() + 10)
    expect(state.stats.taps).toBe(1)
  })

  it('quầy có người phụ: chạm nhận 5% một chu kỳ', () => {
    const state = newState(1e9)
    buyStall(state, STALLS, 'xoi', 10)
    buyHelper(state, STALLS, 'xoi')
    const reward = tapStall(state, STALLS, 'xoi', 1000)
    expect(reward.toNumber()).toBe(10 * HELPED_TAP_SHARE)
  })

  it('quẩy count=0 hoặc id lạ: thưởng 0', () => {
    const state = newState(1000)
    expect(tapStall(state, STALLS, 'banhmi', 1000).toNumber()).toBe(0)
    expect(tapStall(state, STALLS, 'khong-co', 1000).toNumber()).toBe(0)
  })

  it('giới hạn 10 chạm có thưởng mỗi giây, reset sang giây mới', () => {
    const state = newState(1e9)
    buyStall(state, STALLS, 'xoi', 10)
    let total = new Decimal(0)
    for (let i = 0; i < 15; i++) total = total.add(tapStall(state, STALLS, 'xoi', 10_000))
    expect(total.toNumber()).toBe(10 * 10) // 10 chạm có thưởng × 10 tiền
    // giây kế (bucket khác) — đếm lại từ 0
    total = total.add(tapStall(state, STALLS, 'xoi', 11_000))
    expect(total.toNumber()).toBe(10 * 10 + 10)
    expect(state.stats.taps).toBe(TAP_REWARD_PER_SEC + 1)
  })
})

/** Xóa hàm bulk tay — các test dùng bulkCost chính thức. */
