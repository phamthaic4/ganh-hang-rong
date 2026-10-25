import Decimal from 'break_infinity.js'
import type { GameState, StallDef } from './types'

/** Mốc nhân đôi của riêng mỗi quầy (PLAN.md mục 5.2). */
const STALL_MILESTONES = [25, 50, 100, 200, 300, 400]
/** Mốc nhân đôi toàn cục: mọi quầy cùng đạt. */
const GLOBAL_MILESTONES = [25, 50, 100, 200]

/** Giá của đơn vị thứ n+1: floor(baseCost × growth^n). */
export function costOf(stall: StallDef, n: number): Decimal {
  return Decimal.floor(
    new Decimal(stall.baseCost).mul(new Decimal(stall.growth).pow(n)),
  )
}

/** Tổng giá mua `count` đơn vị từ mức `from` bằng tổng cấp số nhân đóng. */
export function bulkCost(stall: StallDef, from: number, count: number): Decimal {
  if (count <= 0) return new Decimal(0)
  const g = new Decimal(stall.growth)
  const sum = new Decimal(stall.baseCost)
    .mul(g.pow(from))
    .mul(g.pow(count).sub(1))
    .div(g.sub(1))
  return Decimal.floor(sum)
}

/** Số đơn vị mua được nhiều nhất với `money`, từ mức `from`. */
export function maxBuyCount(stall: StallDef, from: number, money: Decimal): number {
  const firstCost = costOf(stall, from)
  if (money.lt(1) || money.lt(firstCost)) return 0
  const g = new Decimal(stall.growth)
  // k = log_g( money·(g−1) / (baseCost·g^from) + 1 ); log10() trả number.
  const inner = money
    .mul(g.sub(1))
    .div(new Decimal(stall.baseCost).mul(g.pow(from)))
    .add(1)
  let k = Math.floor(inner.log10() / g.log10())
  if (k < 0) k = 0
  while (bulkCost(stall, from, k + 1).lte(money)) k++
  while (k > 0 && bulkCost(stall, from, k).gt(money)) k--
  return k
}

/** Hệ số mốc nhân đôi của một quầy theo số unit hiện có. */
export function stallMilestoneMultiplier(count: number): number {
  let m = 1
  for (const t of STALL_MILESTONES) if (count >= t) m *= 2
  return m
}

/** Hệ số mốc nhân đôi toàn cục: đạt khi MỌI quầy cùng đạt ngưỡng. */
export function globalMilestoneMultiplier(stalls: StallDef[], state: GameState): number {
  let m = 1
  for (const t of GLOBAL_MILESTONES) {
    const allReached = stalls.every(
      (def) => (state.stalls[def.id]?.count ?? 0) >= t,
    )
    if (allReached) m *= 2
  }
  return m
}

/** Thu nhập một chu kỳ của quầy (đã nhân mốc nhân đôi). */
export function cycleIncome(
  state: GameState,
  stalls: StallDef[],
  stallId: string,
): Decimal {
  const def = stalls.find((s) => s.id === stallId)
  const st = state.stalls[stallId]
  if (!def || !st || st.count === 0) return new Decimal(0)
  const mult =
    stallMilestoneMultiplier(st.count) * globalMilestoneMultiplier(stalls, state)
  return new Decimal(def.baseIncome).mul(st.count).mul(mult)
}

/** Thu nhập thụ động mỗi giây: chỉ gồm quầy đã có người phụ. */
export function incomePerSec(state: GameState, stalls: StallDef[]): Decimal {
  const globalMult = globalMilestoneMultiplier(stalls, state)
  let total = new Decimal(0)
  for (const def of stalls) {
    const st = state.stalls[def.id]
    if (!st || st.count === 0 || !st.helper) continue
    const inc = new Decimal(def.baseIncome)
      .mul(st.count)
      .mul(stallMilestoneMultiplier(st.count))
      .mul(globalMult)
    total = total.add(inc.div(def.cycleSec))
  }
  return total
}

/**
 * Mua `qty` đơn vị (hoặc tối đa khi qty === 'max'). Trả về số unit thực mua;
 * 0 khi không đủ tiền (không mua một phần).
 */
export function buyStall(
  state: GameState,
  stalls: StallDef[],
  stallId: string,
  qty: number | 'max',
): number {
  const def = stalls.find((s) => s.id === stallId)
  const st = def ? state.stalls[stallId] : undefined
  if (!def || !st || qty === 0) return 0
  const from = st.count
  const count = qty === 'max' ? maxBuyCount(def, from, state.money) : qty
  if (count <= 0) return 0
  const cost = bulkCost(def, from, count)
  if (cost.gt(state.money)) return 0
  state.money = state.money.sub(cost)
  st.count += count
  return count
}

/** Thuê người phụ cho quầy (chưa có và đã có ít nhất 1 unit). */
export function buyHelper(
  state: GameState,
  stalls: StallDef[],
  stallId: string,
): boolean {
  const def = stalls.find((s) => s.id === stallId)
  const st = def ? state.stalls[stallId] : undefined
  if (!def || !st || st.helper || st.count === 0) return false
  const cost = new Decimal(def.helperCost)
  if (cost.gt(state.money)) return false
  state.money = state.money.sub(cost)
  st.helper = true
  return true
}
