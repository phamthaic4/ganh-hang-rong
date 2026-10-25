import Decimal from 'break_infinity.js'
import type { GameState, StallDef } from './types'
import { cycleIncome } from './economy'

/** Thưởng chạm tối đa mỗi giây (PLAN.md mục 5.2). */
export const TAP_REWARD_PER_SEC = 10
/** Chạm quầy đã có người phụ: thưởng 5% một chu kỳ. */
export const HELPED_TAP_SHARE = 0.05

/**
 * Cộng dồn thu nhập tự động sau `dtSec` giây. Thu nhập một chu kỳ không đổi
 * trong lần gọi nên hoàn thành nhiều chu kỳ cùng lúc vẫn chính xác tuyệt đối.
 */
export function advance(state: GameState, stalls: StallDef[], dtSec: number): Decimal {
  if (dtSec <= 0) return new Decimal(0)
  let earned = new Decimal(0)
  for (const def of stalls) {
    const st = state.stalls[def.id]
    if (!st || st.count === 0 || !st.helper) continue
    st.progress += dtSec
    if (st.progress >= def.cycleSec) {
      const cycles = Math.floor(st.progress / def.cycleSec)
      st.progress -= cycles * def.cycleSec
      earned = earned.add(cycleIncome(state, stalls, def.id).mul(cycles))
    }
  }
  if (earned.gt(0)) {
    state.money = state.money.add(earned)
    state.earnedThisRun = state.earnedThisRun.add(earned)
  }
  return earned
}

/** Vòng tick theo thời gian thực; bỏ qua nếu đồng hồ bị chỉnh lùi. */
export function tick(state: GameState, stalls: StallDef[], nowMs: number): Decimal {
  const dtSec = (nowMs - state.lastTickAt) / 1000
  if (dtSec < 0) return new Decimal(0)
  state.lastTickAt = nowMs
  return advance(state, stalls, dtSec)
}

/**
 * Chạm quầy: chưa có người phụ thì hoàn thành một chu kỳ, đã có thì nhận
 * 5% một chu kỳ. Thưởng giới hạn TAP_REWARD_PER_SEC lần/giây (toàn cục).
 */
export function tapStall(
  state: GameState,
  stalls: StallDef[],
  stallId: string,
  nowMs: number,
): Decimal {
  const def = stalls.find((s) => s.id === stallId)
  const st = def ? state.stalls[stallId] : undefined
  if (!def || !st || st.count === 0) return new Decimal(0)

  const bucket = Math.floor(nowMs / 1000)
  if (state.tapBucket !== bucket) {
    state.tapBucket = bucket
    state.tapCount = 0
  }
  if (state.tapCount >= TAP_REWARD_PER_SEC) return new Decimal(0)
  state.tapCount++
  state.stats.taps++

  const oneCycle = cycleIncome(state, stalls, stallId)
  const reward = st.helper ? oneCycle.mul(HELPED_TAP_SHARE) : oneCycle
  if (!st.helper) st.progress = 0
  state.money = state.money.add(reward)
  state.earnedThisRun = state.earnedThisRun.add(reward)
  return reward
}
