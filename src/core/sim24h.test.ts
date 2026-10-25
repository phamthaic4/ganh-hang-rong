import { describe, expect, it } from 'vitest'
import { STALLS } from './data'
import { createInitialState } from './state'
import { buyHelper, buyStall, incomePerSec } from './economy'
import { tapStall, tick } from './tick'

/**
 * Mô phỏng 24 giờ chơi với người chơi tham lam:
 * - 10 phút đầu chạm 2 lần/giây vào quầy tốt nhất.
 * - Cứ 5 giây xét mua: mở quầy mới → thuê người phụ → maxBuy quầy rẻ nhất.
 * Nghiệm thu M1: không tràn số, không NaN, tiến độ chu kỳ luôn hợp lệ.
 */
describe('mô phỏng 24 giờ không tràn số', () => {
  it('toàn bộ giá trị hữu hạn sau 86400 giây', () => {
    const state = createInitialState(STALLS, 0)
    const SECOND = 1000

    for (let sec = 1; sec <= 86400; sec++) {
      tick(state, STALLS, sec * SECOND)

      if (sec <= 600 && sec % 1 === 0) {
        // 2 chạm/giây: chạm ở hai thời điểm khác nhau trong cùng giây
        tapStall(state, STALLS, bestTapStall(state), sec * SECOND - 500)
        tapStall(state, STALLS, bestTapStall(state), sec * SECOND)
      }

      if (sec % 5 === 0) greedySpend(state)
    }

    expect(Number.isFinite(state.money.m)).toBe(true)
    expect(Number.isFinite(state.money.e)).toBe(true)
    expect(Number.isFinite(state.earnedThisRun.m)).toBe(true)
    // "Mua tối đa" có thể đưa tiền về đúng 0 — điều bình thường; chỉ cần
    // không âm, không NaN/Infinity (mục tiêu: không tràn số).
    expect(state.money.gte(0)).toBe(true)
    expect(state.earnedThisRun.gt(0)).toBe(true)
    expect(incomePerSec(state, STALLS).gt(0)).toBe(true)

    for (const def of STALLS) {
      const st = state.stalls[def.id]
      expect(Number.isFinite(st.progress)).toBe(true)
      expect(st.progress).toBeGreaterThanOrEqual(0)
      expect(st.progress).toBeLessThan(def.cycleSec)
    }

    console.log(
      '24h → money:', state.money.toString(),
      '| income/s:', incomePerSec(state, STALLS).toString(),
      '| taps:', state.stats.taps,
    )
  })
})

/** Quầy đã có unit, ưu tiên chưa người phụ và thu/chu kỳ cao. */
function bestTapStall(state: ReturnType<typeof createInitialState>): string {
  let best = 'xoi'
  let bestScore = -1
  for (const def of STALLS) {
    const st = state.stalls[def.id]
    if (st.count === 0) continue
    const score = def.baseIncome * (st.helper ? 0.05 : 1)
    if (score > bestScore) {
      bestScore = score
      best = def.id
    }
  }
  return best
}

function greedySpend(state: ReturnType<typeof createInitialState>): void {
  // 1. Mở quầy kế tiếp chưa có unit
  const next = STALLS.find((d) => state.stalls[d.id].count === 0)
  if (next && state.money.gte(next.baseCost)) {
    buyStall(state, STALLS, next.id, 1)
    return
  }
  // 2. Thuê người phụ cho quầy chưa có (rẻ nhất trước)
  const needHelper = STALLS.filter((d) => {
    const st = state.stalls[d.id]
    return st.count > 0 && !st.helper && state.money.gte(d.helperCost)
  }).sort((a, b) => a.helperCost - b.helperCost)
  if (needHelper.length > 0) {
    buyHelper(state, STALLS, needHelper[0].id)
    return
  }
  // 3. Còn quầy chờ người phụ thì để dành tiền; hết rồi mới rót vào unit.
  const stillWaiting = STALLS.some(
    (d) => state.stalls[d.id].count > 0 && !state.stalls[d.id].helper,
  )
  if (!stillWaiting) {
    buyStall(state, STALLS, 'xoi', 'max')
  }
}
